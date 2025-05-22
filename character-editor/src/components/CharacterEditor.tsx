import { useEffect, useRef, useState } from "preact/hooks";

import Editor from "../editor/Editor.js";
import { isFulfilled, isRejected } from "../lib/utils.ts";
import { blossomService } from "../services/blossomService.ts";
import type {
  BlossomDrive,
  Emotion,
  ServerOption,
} from "../services/nostrService.ts";
import { nostrService, type UserRelay } from "../services/nostrService.ts";
import "../styles/svgedit.css";

import { BlossomServerManager } from "./BlossomServerManager.tsx";
import { DriveSelector } from "./DriveSelector.tsx";
import { EmotionManager } from "./EmotionManager.tsx";
import { FileExplorer } from "./FileExplorer.tsx";

type SelectedAsset = {
  path: string;
  sha256: string;
  blob: Blob;
};

export const CharacterEditor = () => {
  const svgEditorRef = useRef<InstanceType<typeof Editor> | null>(null);
  const selectedAssetRef = useRef<SelectedAsset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
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
        show_outside_canvas: true,
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

    const uploadResults = await blossomService.uploadAsset(
      svgBlob,
      servers
        .filter(({ 1: selected }) => selected)
        .map(({ 0: server }) => server),
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

    await nostrService.publishBlossomDrive(selectedDrive, userWriteRelays);

    setIsDirty(false);
  };

  const handleAssetSelect = async (
    path: string,
    sha256: string,
    blob: Blob,
  ) => {
    if (!svgEditorRef.current) {
      return;
    }

    if (!isEditorReady) {
      return;
    }

    if (isDirty) {
      if (!confirm("You have unsaved changes. Do you want to continue?")) {
        return;
      }
    }

    console.log("Selected asset:", path);

    svgEditorRef.current.loadSvgString(await blob.text());

    setIsDirty(false);
    setSelectedAsset({ path, sha256, blob });
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

      await nostrService.publishBlossomDrive(selectedDrive, userWriteRelays);
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
          <DriveSelector value={selectedDrive} onChange={setSelectedDrive} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedDrive && (
            <>
              <FileExplorer
                drive={selectedDrive}
                onAssetSelect={handleAssetSelect}
              />
              {selectedAsset && (
                <div className="border-t border-gray-200">
                  <EmotionManager
                    assetPath={selectedAsset.path}
                    assetSha256={selectedAsset.sha256}
                    emotions={selectedDrive.emotions}
                    onEmotionsChange={handleEmotionsChange}
                  />
                </div>
              )}
            </>
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
