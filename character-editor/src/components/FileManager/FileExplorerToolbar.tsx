import { useState } from "preact/hooks";

import {
  assertUnreachable,
  findParentFolder,
  getNodeByPath,
} from "../../lib/utils";
import { blossomService } from "../../services/blossomService";
import type { BlobDescriptor } from "../../services/blossomService";
import { nostrService } from "../../services/nostrService";
import type {
  BlossomDrive,
  BlossomX,
  RelayUrl,
  Server,
} from "../../services/types";

import type { AssetNode, FileSource } from "./types";
import { UploadModal } from "./UploadModal";

interface FileExplorerToolbarProps {
  selectedNode: AssetNode;
  tree: AssetNode[];
  setDrives: (drives: BlossomDrive[]) => void;
  selectedDrive: BlossomDrive;
  setSelectedDrive: (drive: BlossomDrive) => void;
  selectedServers: Server[];
  userWriteRelays: RelayUrl[];
}

export const FileExplorerToolbar = ({
  selectedNode,
  tree,
  setDrives,
  selectedDrive,
  setSelectedDrive,
  selectedServers,
  userWriteRelays,
}: FileExplorerToolbarProps) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  if (!selectedNode) {
    return null;
  }

  const onDelete = async () => {
    if (selectedNode.type === "svg") {
      if (!confirm("Are you sure you want to delete this asset?")) {
        return;
      }

      console.log("Delete", selectedNode.path);

      const updatedDrive = {
        ...selectedDrive,
        x: selectedDrive.x.filter((x) => x.path !== selectedNode.path),
      };

      await nostrService.updateDrive({
        updatedDrive,
        selectedDrive,
        selectedServers,
        userWriteRelays,
        setDrives,
        setSelectedDrive,
      });

      await blossomService.deleteFile(selectedNode.sha256, selectedServers);
    } else if (selectedNode.type === "directory") {
      if (
        !confirm(
          "Are you sure you want to delete this folder with all its assets?",
        )
      ) {
        return;
      }

      const updatedDrive = {
        ...selectedDrive,
        folders: selectedDrive.folders.filter(
          (folder) => folder !== selectedNode.path,
        ),
        x: selectedDrive.x.filter((x) => !x.path.startsWith(selectedNode.path)),
      };

      await nostrService.updateDrive({
        updatedDrive,
        selectedDrive,
        selectedServers,
        userWriteRelays,
        setDrives,
        setSelectedDrive,
      });

      const deleteFolder = async (folder: AssetNode) => {
        if (folder.type === "svg") {
          await blossomService.deleteFile(folder.sha256, selectedServers);
        } else if (folder.type === "directory") {
          folder.children.forEach(async (child) => {
            await deleteFolder(child);
          });
        } else {
          assertUnreachable(folder);
        }
      };

      await deleteFolder(selectedNode);
    } else {
      // This assertion ensures type exhaustiveness
      assertUnreachable(selectedNode, "Unknown node type");
    }
  };

  const onNewFolder = async () => {
    // Get the target directory path where the new folder will be created
    const targetDirPath =
      selectedNode.type === "svg"
        ? selectedNode.path.substring(0, selectedNode.path.lastIndexOf("/"))
        : selectedNode.path;

    // Prompt for folder name
    const folderName = prompt("Enter folder name:");
    if (!folderName?.trim()) {
      return;
    }

    // Create the new folder path
    const newFolderPath = `${targetDirPath}/${folderName}`.replace(/\/+/g, "/");

    if (getNodeByPath(newFolderPath, tree)) {
      alert("Path already exists");

      return;
    }

    // Update the drive with the new folder
    const updatedDrive = {
      ...selectedDrive,
      folders: [...selectedDrive.folders, newFolderPath],
    };

    await nostrService.updateDrive({
      updatedDrive,
      selectedDrive,
      selectedServers,
      userWriteRelays,
      setDrives,
      setSelectedDrive,
    });
  };

  const onDuplicate = async () => {
    if (selectedNode.type === "svg") {
      // Update the drive with the new file
      const toDuplicate = selectedDrive.x.find(
        (x) => x.path === selectedNode.path,
      );

      if (!toDuplicate) {
        return;
      }

      const newPath = prompt("Enter new path:", selectedNode.path);

      if (!newPath?.trim()) {
        return;
      }

      if (getNodeByPath(newPath, tree)) {
        alert("Path already exists");

        return;
      }

      toDuplicate.path = newPath;

      const updatedDrive = {
        ...selectedDrive,
        x: [...selectedDrive.x, toDuplicate].sort((a, b) =>
          a.path.localeCompare(b.path),
        ),
      };

      await nostrService.updateDrive({
        updatedDrive,
        selectedDrive,
        selectedServers,
        userWriteRelays,
        setDrives,
        setSelectedDrive,
      });
    } else if (selectedNode.type === "directory") {
      const newPath = prompt("Enter new path:", selectedNode.path);

      if (!newPath?.trim()) {
        return;
      }

      if (getNodeByPath(newPath, tree)) {
        alert("Path already exists");

        return;
      }

      const duplicates: BlossomX[] = [];

      const duplicateFolder = async (node: AssetNode) => {
        if (node.type === "svg") {
          const toDuplicate = selectedDrive.x.find((x) => x.path === node.path);

          if (toDuplicate) {
            duplicates.push({
              ...toDuplicate,
              path:
                newPath + toDuplicate.path.substring(selectedNode.path.length),
            });
          }
        } else if (node.type === "directory") {
          node.children.forEach(async (child) => {
            await duplicateFolder(child);
          });
        } else {
          assertUnreachable(node);
        }
      };

      await duplicateFolder(selectedNode);

      const updatedDrive = {
        ...selectedDrive,
        x: [...selectedDrive.x, ...duplicates].sort((a, b) =>
          a.path.localeCompare(b.path),
        ),
      };

      await nostrService.updateDrive({
        updatedDrive,
        selectedDrive,
        selectedServers,
        userWriteRelays,
        setDrives,
        setSelectedDrive,
      });
    } else {
      assertUnreachable(selectedNode);
    }
  };

  const onUpload = () => {
    setIsUploadModalOpen(true);
  };

  const handleUpload = async (source: FileSource) => {
    const path =
      selectedNode.type === "svg"
        ? findParentFolder(selectedNode, tree)
        : selectedNode.path;

    let results: PromiseSettledResult<
      BlobDescriptor | { size: number; url: string; sha256: string }
    >[];

    if (source.type === "file") {
      results = await blossomService.uploadAsset(source.file, selectedServers);
    } else if (source.type === "url") {
      // Fetch the file first
      const response = await fetch(source.url);
      const blob = await response.blob();
      const file = new File([blob], "downloaded.svg", {
        type: "image/svg+xml",
      });

      results = await blossomService.uploadAsset(file, selectedServers);
    } else if (source.type === "hash") {
      const { size, url, sha256 } = await blossomService.fetchFile(
        source.hash,
        selectedServers,
      );

      results = [
        { status: "fulfilled" as const, value: { size, url, sha256 } },
      ];
    } else {
      assertUnreachable(source);
    }

    const successfulResults = results.filter(
      (result) => result.status === "fulfilled",
    );
    const failedResults = results.filter(
      (result) => result.status === "rejected",
    );

    successfulResults.forEach((result) => {
      console.log("Uploaded asset to: ", result.value.url);
    });

    failedResults.forEach((result) => {
      console.error("Failed to upload asset: ", result.reason);
    });

    if (successfulResults.length === 0) {
      return;
    }

    const result = successfulResults[0].value;

    const getFileName = (source: FileSource) => {
      if (source.type === "file") {
        return source.file.name;
      } else if (source.type === "url") {
        return source.url.split("/").pop() || "downloaded.svg";
      } else if (source.type === "hash") {
        return `${source.name}.svg`;
      } else {
        assertUnreachable(source);
      }
    };

    const fileName = getFileName(source);

    const updatedDrive = {
      ...selectedDrive,
      x: [
        ...selectedDrive.x,
        {
          sha256: result.sha256,
          path: `${path}/${fileName}`,
          size: result.size,
          mime: "image/svg+xml",
        },
      ].sort((a, b) => a.path.localeCompare(b.path)),
      folders: selectedDrive.folders.filter((folder) => folder !== path),
    };

    await nostrService.updateDrive({
      updatedDrive,
      selectedDrive,
      selectedServers,
      userWriteRelays,
      setDrives,
      setSelectedDrive,
    });
  };

  return (
    <>
      <div className="border-t border-gray-200 p-2 flex gap-2 flex-wrap bg-white">
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center text-lg bg-red-50 text-red-600 rounded hover:bg-red-100"
          title="Delete"
        >
          🗑️
        </button>
        <button
          onClick={onNewFolder}
          className="w-8 h-8 flex items-center justify-center text-lg bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          title="New Folder"
        >
          📁
        </button>
        <button
          onClick={onDuplicate}
          className="w-8 h-8 flex items-center justify-center text-lg bg-green-50 text-green-600 rounded hover:bg-green-100"
          title="Duplicate"
        >
          📋
        </button>
        <button
          onClick={() => {
            const newPath = prompt("Enter new path:", selectedNode.path);

            if (!newPath?.trim()) {
              return;
            }

            if (getNodeByPath(newPath, tree)) {
              alert("Path already exists");

              return;
            }

            return onEditPath({
              newPath,
              selectedNode,
              selectedDrive,
              selectedServers,
              userWriteRelays,
              setDrives,
              setSelectedDrive,
            });
          }}
          className="w-8 h-8 flex items-center justify-center text-lg bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100"
          title="Edit Path"
        >
          ✏️
        </button>
        <button
          onClick={onUpload}
          className="w-8 h-8 flex items-center justify-center text-lg bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
          title="Upload"
        >
          ⬆️
        </button>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        path={
          selectedNode.type === "svg"
            ? findParentFolder(selectedNode, tree)
            : selectedNode.path
        }
      />
    </>
  );
};

export const updateFolder = ({
  folders,
  selectedNode,
  newPath,
}: {
  folders: string[];
  selectedNode: AssetNode;
  newPath: string;
}): string[] => {
  return folders.map((folder) => {
    if (folder === selectedNode.path) {
      return newPath;
    }

    // If this is a child folder, update its path to reflect the parent's new path
    if (folder.startsWith(selectedNode.path + "/")) {
      return newPath + folder.substring(selectedNode.path.length);
    }

    return folder;
  });
};

export const updatePath = ({
  blossomXs,
  selectedNode,
  newPath,
}: {
  blossomXs: BlossomX[];
  selectedNode: AssetNode;
  newPath: string;
}): BlossomX[] => {
  return blossomXs.map((blossomX) => {
    if (blossomX.path.startsWith(selectedNode.path)) {
      return {
        ...blossomX,
        path: newPath + blossomX.path.substring(selectedNode.path.length),
      };
    }

    return blossomX;
  });
};

export const onEditPath = async ({
  newPath,
  selectedNode,
  selectedDrive,
  selectedServers,
  userWriteRelays,
  setDrives,
  setSelectedDrive,
}: {
  newPath: string;
  selectedNode: AssetNode;
  selectedDrive: BlossomDrive;
  selectedServers: Server[];
  userWriteRelays: RelayUrl[];
  setDrives: (drives: BlossomDrive[]) => void;
  setSelectedDrive: (drive: BlossomDrive) => void;
}) => {
  if (selectedNode.type === "svg") {
    // Get the source and target folder paths
    const sourceFolderPath = selectedNode.path.substring(
      0,
      selectedNode.path.lastIndexOf("/"),
    );
    const targetFolderPath = newPath.substring(0, newPath.lastIndexOf("/"));

    // Check if source folder will be empty after move
    const sourceWillBeEmpty = !selectedDrive.x.some(
      (x) =>
        x.path !== selectedNode.path && // Not the current SVG
        x.path.startsWith(sourceFolderPath + "/"), // Is in the source folder
    );

    // Update the drive with new path for the SVG
    const updatedDrive = {
      ...selectedDrive,
      x: selectedDrive.x.map((x) =>
        x.path === selectedNode.path ? { ...x, path: newPath } : x,
      ),
      folders: [
        // Keep existing folders except target folder
        ...selectedDrive.folders.filter(
          (folder) => folder !== targetFolderPath,
        ),
        // Add source folder if it will be empty (no SVGs left in it)
        ...(sourceWillBeEmpty ? [sourceFolderPath] : []),
      ].sort((a, b) => a.localeCompare(b)),
    };

    await nostrService.updateDrive({
      updatedDrive,
      selectedDrive,
      selectedServers,
      userWriteRelays,
      setDrives,
      setSelectedDrive,
    });
  } else if (selectedNode.type === "directory") {
    const updatedDrive = {
      ...selectedDrive,
      x: updatePath({ blossomXs: selectedDrive.x, selectedNode, newPath }),
      folders: updateFolder({
        folders: selectedDrive.folders,
        selectedNode,
        newPath,
      }),
    };

    await nostrService.updateDrive({
      updatedDrive,
      selectedDrive,
      selectedServers,
      userWriteRelays,
      setDrives,
      setSelectedDrive,
    });
  } else {
    assertUnreachable(selectedNode);
  }
};
