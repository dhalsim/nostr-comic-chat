import { useEffect, useRef, useState } from "preact/hooks";

import Editor from "../editor/Editor.js";
import { assertUnreachable, isFulfilled, isRejected } from "../lib/utils.ts";
import { blossomService } from "../services/blossomService.ts";
import { nostrService } from "../services/nostrService.ts";
import type {
  BlossomDrive,
  Emotion,
  Server,
  ServerOption,
  UserRelay,
} from "../services/types";
import "../styles/svgedit.css";

import { BlossomServerManager } from "./BlossomServerManager.tsx";
import { DriveSelector } from "./DriveSelector.tsx";
import { FileExplorer } from "./FileManager/FileExplorer.tsx";

type SelectedAsset = {
  path: string;
  sha256: string;
  blob: Blob;
};

export type HandleAssetSelectParams =
  | {
      type: "Select";
      path: string;
      sha256: string;
      blob: Blob;
    }
  | { type: "Clear"; path: string };

export const CharacterEditor = () => {
  const svgEditorRef = useRef<InstanceType<typeof Editor> | null>(null);
  const selectedAssetRef = useRef<SelectedAsset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [drives, setDrives] = useState<BlossomDrive[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<BlossomDrive | null>(null);
  const [userRelayList, setUserRelayList] = useState<UserRelay[]>([]);
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Update ref when selectedAsset changes
  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  // Initialize the SVG editor
  useEffect(() => {
    let editor: InstanceType<typeof Editor> | null = null;
    let changeHandler: ((data: any) => void) | null = null;

    const initEditor = async () => {
      const container = document.getElementById("container");

      if (!container) {
        return;
      }

      editor = new Editor(container);

      editor.setConfig({
        allowInitialUserOverride: true,
        extensions: [],
        noDefaultExtensions: false,
        userExtensions: [],
        initFill: {
          color: "000000",
          opacity: 1,
        },
        initStroke: {
          color: "000000",
          opacity: 1,
          width: 2,
        },
        initOpacity: 1,
        dimensions: [640, 480] as [number, number],
        show_outside_canvas: false,
        selectNew: true,
        noStorageOnLoad: true,
      });

      svgEditorRef.current = editor;

      try {
        if (!isEditorReady) {
          await editor.init();
          setIsEditorReady(true);

          // Listen for SVG content changes
          changeHandler = (data: any) => {
            if (data && selectedAssetRef.current) {
              setIsDirty(true);
            }
          };

          editor.svgCanvas.bind("changed", changeHandler);
        }
      } catch (error) {
        console.error("Failed to initialize SVG editor:", error);
      }
    };

    initEditor();

    return () => {
      if (editor?.svgCanvas && changeHandler) {
        editor.svgCanvas.unbind("changed", changeHandler);
      }
    };
  }, []);

  // Load user relay list
  useEffect(() => {
    const loadUserRelayList = async () => {
      const pubkey = await nostrService.getPubkeyHex();

      if (!pubkey) {
        return;
      }

      const userRelayList = await nostrService.getUserRelayList(pubkey);

      setUserRelayList(userRelayList);
    };

    loadUserRelayList();
  }, []);

  // Load SVG content when asset is selected
  useEffect(() => {
    const loadAsset = async () => {
      if (
        isEditorReady &&
        svgEditorRef.current?.svgCanvas &&
        selectedAsset?.blob
      ) {
        svgEditorRef.current.svgCanvas.clear();
        svgEditorRef.current.loadSvgString(await selectedAsset.blob.text());
        setIsDirty(false);
      }
    };

    loadAsset();
  }, [selectedAsset, isEditorReady]);

  const handleSaveSvg = async () => {
    setError(null);

    if (!selectedDrive) {
      setError("No drive selected");

      return;
    }

    if (!svgEditorRef.current?.svgCanvas || !selectedAssetRef.current) {
      setError("No SVG editor or selected asset");

      return;
    }

    const svgContent = svgEditorRef.current.svgCanvas.getSvgString();
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const selectedServers: Server[] = servers
      .filter(({ 1: selected }) => selected)
      .map(({ 0: server }) => server);

    const uploadResults = await blossomService.uploadAsset(
      svgBlob,
      selectedServers,
    );

    const fulfilledResults = uploadResults.filter(isFulfilled);

    fulfilledResults.map((x) => console.log(x.value.url));
    uploadResults.filter(isRejected).map((x) => console.error(x.reason));

    if (!fulfilledResults.length) {
      setError("Failed to upload asset");

      return;
    }

    const updatedAsset = fulfilledResults[0].value;
    const pubkey = await nostrService.getPubkeyHex();

    if (!pubkey) {
      setError("No pubkey available");

      return;
    }

    const userRelayList = await nostrService.getUserRelayList(pubkey);
    const userWriteRelays = userRelayList
      .filter((relay) => relay.write)
      .map((relay) => relay.url);

    if (!userWriteRelays.length) {
      setError("No write relays available");

      return;
    }

    selectedDrive.x = selectedDrive.x.map((x) => {
      if (x.sha256 === selectedAsset?.sha256) {
        x.sha256 = updatedAsset.sha256;
        x.size = updatedAsset.size;
      }

      return x;
    });

    await nostrService.publishBlossomDrive(
      selectedDrive,
      selectedServers,
      userWriteRelays,
    );

    setIsDirty(false);
  };

  const handleAssetSelect = async (params: HandleAssetSelectParams) => {
    if (!svgEditorRef.current) {
      return;
    }

    if (!isEditorReady) {
      return;
    }

    console.log("Selected asset:", params.path);
    const cb = svgEditorRef.current.svgCanvas.getElement("canvasBackground");

    if (params.type === "Select") {
      cb.style.display = "block";
      svgEditorRef.current.loadSvgString(await params.blob.text());

      setSelectedAsset({
        path: params.path,
        sha256: params.sha256,
        blob: params.blob,
      });
    } else if (params.type === "Clear") {
      svgEditorRef.current.svgCanvas.clear();
      cb.style.display = "none";

      setSelectedAsset(null);
    } else {
      assertUnreachable(params);
    }

    setIsDirty(false);
  };

  const handleEmotionsChange = async (newEmotions: Emotion[]) => {
    if (!selectedDrive || !selectedAsset) {
      return;
    }

    try {
      selectedDrive.emotions = newEmotions;

      const pubkey = await nostrService.getPubkeyHex();
      if (!pubkey) {
        setError("No pubkey available");

        return;
      }

      const userRelayList = await nostrService.getUserRelayList(pubkey);
      const userWriteRelays = userRelayList
        .filter((relay) => relay.write)
        .map((relay) => relay.url);

      if (!userWriteRelays.length) {
        setError("No write relays available");

        return;
      }

      const selectedServers: Server[] = servers
        .filter(({ 1: selected }) => selected)
        .map(({ 0: server }) => server);

      await nostrService.publishBlossomDrive(
        selectedDrive,
        selectedServers,
        userWriteRelays,
      );
    } catch (err) {
      setError("Failed to save emotions");
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - File Explorer & Drive Selection */}
      <div className="w-64 h-full border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <DriveSelector
            value={selectedDrive}
            drives={drives}
            setDrives={setDrives}
            onChange={setSelectedDrive}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedDrive && (
            <FileExplorer
              drive={selectedDrive}
              setDrives={setDrives}
              setSelectedDrive={setSelectedDrive}
              userWriteRelays={userRelayList
                .filter((relay) => relay.write)
                .map((relay) => relay.url)}
              isDirty={isDirty}
              onAssetSelect={handleAssetSelect}
              onEmotionsChange={handleEmotionsChange}
            />
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div id="container" className="flex-1 min-h-0"></div>
        {/* Asset Management */}
        {selectedAsset && (
          <div className="flex-none border-t border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-gray-600">
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
                {error && <div className="text-red-500">{error}</div>}
                <button
                  onClick={handleSaveSvg}
                  disabled={!isDirty}
                  className={`px-4 py-2 rounded ${
                    isDirty
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Save SVG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Server Manager & Character List */}
      <div className="w-80 h-full border-l border-gray-200 flex flex-col">
        <div className="flex-none p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Blossom Servers</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select Blossom servers to upload your assets.
            <a
              href="https://blossomservers.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline ml-1"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <BlossomServerManager
            userRelayList={userRelayList}
            setServers={setServers}
            servers={servers}
          />
        </div>
      </div>
    </div>
  );
};
