import { useEffect, useState } from "preact/hooks";

import { assertUnreachable, getNodeByPath } from "@lib/utils";
import { blossomService } from "@services/blossomService";
import type { BlossomDrive, RelayUrl, Emotion } from "@services/types";

import { type HandleAssetSelectParams } from "../CharacterEditor";

import { FileExplorerToolbar, onEditPath } from "./FileExplorerToolbar";
import { EmotionManager } from "./KeywordsManager";
import type { AssetNode, BlobResult, DirectoryNode, SvgNode } from "./types";

interface FileExplorerProps {
  drive: BlossomDrive;
  setDrives: (drives: BlossomDrive[]) => void;
  setSelectedDrive: (drive: BlossomDrive) => void;
  userWriteRelays: RelayUrl[];
  isDirty: boolean;
  onAssetSelect: (params: HandleAssetSelectParams) => Promise<void>;
  onEmotionsChange: (emotions: Emotion[]) => Promise<void>;
}

export const FileExplorer = ({
  drive,
  setDrives,
  setSelectedDrive,
  userWriteRelays,
  isDirty,
  onAssetSelect,
  onEmotionsChange,
}: FileExplorerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<AssetNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<AssetNode | null>(null);
  const [blobResults, setBlobResults] = useState<Record<string, BlobResult>>(
    {},
  );
  const [draggedNode, setDraggedNode] = useState<AssetNode | null>(null);
  const [dragOverNode, setDragOverNode] = useState<AssetNode | null>(null);

  useEffect(() => {
    if (!drive) {
      setTree([]);
      setBlobResults({});

      return;
    }

    const loadDrive = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchResults = await blossomService.fetchDrive(drive);

        const errors = fetchResults
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason);

        if (errors.length > 0) {
          setError(errors.join(", "));

          setIsLoading(false);

          return;
        }

        const results = fetchResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value as BlobResult);

        // Create a map of sha256 to blob results
        const blobMap: Record<string, BlobResult> = {};
        results.forEach((result) => {
          blobMap[result.sha256] = result;
        });

        setBlobResults(blobMap);
        setTree(buildTree(drive));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drive");
        console.error("Failed to load drive:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDrive();
  }, [drive]);

  const handleNodeSelect = (node: AssetNode) => {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Do you want to continue?")) {
        return;
      }
    }

    setSelectedNode(node);

    if (node.type === "svg") {
      const blobResult = blobResults[node.sha256];

      if (blobResult) {
        onAssetSelect({
          type: "Select",
          path: node.path,
          sha256: node.sha256,
          blob: blobResult.blob,
        });
      }
    } else if (node.type === "directory") {
      onAssetSelect({ type: "Clear", path: node.path });
    } else {
      assertUnreachable(node);
    }
  };

  const handleDragStart = (e: DragEvent, node: AssetNode) => {
    console.log("handleDragStart", node);

    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer?.setData("text/plain", node.path);
  };

  const handleDragOver = (e: DragEvent, node: AssetNode) => {
    console.log("handleDragOver", node);

    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(node);
  };

  const handleDragLeave = (e: DragEvent) => {
    console.log("handleDragLeave");

    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);
  };

  const handleDrop = async (e: DragEvent, targetNode: AssetNode) => {
    console.log("handleDrop", targetNode);

    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);

    if (!draggedNode || !drive) {
      return;
    }

    // Don't allow dropping on itself
    if (draggedNode.path === targetNode.path) {
      return;
    }

    // Don't allow dropping a directory into its own subdirectory
    if (
      draggedNode.type === "directory" &&
      targetNode.path.startsWith(draggedNode.path)
    ) {
      return;
    }

    // Calculate new path
    let newPath: string;
    if (targetNode.type === "directory") {
      newPath = `${targetNode.path}/${draggedNode.name}`;
    } else {
      // If dropping on a file, get its parent directory
      const targetDir = targetNode.path.substring(
        0,
        targetNode.path.lastIndexOf("/"),
      );
      newPath = `${targetDir}/${draggedNode.name}`;
    }

    // Check if path already exists
    if (getNodeByPath(newPath, tree)) {
      alert("Path already exists");

      return;
    }

    await onEditPath({
      newPath,
      selectedNode: draggedNode,
      selectedDrive: drive,
      selectedServers: drive.servers,
      userWriteRelays,
      setDrives,
      setSelectedDrive,
    });

    setDraggedNode(null);
  };

  const renderNode = (node: AssetNode, level: number = 0) => {
    const paddingLeft = `${level * 1.5}rem`;
    const isSelected = node.path === selectedNode?.path;
    const isDraggedOver = node.path === dragOverNode?.path;

    if (node.type === "directory") {
      return (
        <div key={node.path}>
          <div
            style={{ paddingLeft }}
            className={`flex items-center py-1 text-sm cursor-pointer ${
              isSelected
                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "text-gray-700 hover:bg-gray-50"
            } ${isDraggedOver ? "border-2 border-blue-500" : ""}`}
            onClick={() => handleNodeSelect(node)}
            draggable
            onDragStart={(e) => handleDragStart(e, node)}
            onDragOver={(e) => handleDragOver(e, node)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node)}
          >
            <span className="mr-2">📁</span>
            {node.name}
          </div>
          {node.children?.map((child) => renderNode(child, level + 1))}
        </div>
      );
    } else if (node.type === "svg") {
      return (
        <div
          key={node.path}
          style={{ paddingLeft }}
          className={`flex items-center py-1 text-sm cursor-pointer ${
            isSelected
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "text-gray-600 hover:bg-gray-50"
          } ${isDraggedOver ? "border-2 border-blue-500" : ""}`}
          onClick={() => handleNodeSelect(node)}
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
        >
          <span className="mr-2">📄</span>
          {node.name}
        </div>
      );
    } else {
      assertUnreachable(node);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-600">Loading drive contents...</div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">Error: {error}</div>;
  }

  if (!drive) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Enter a drive ID to view contents
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-600">
        No assets found in this drive
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 overflow-y-auto max-h-full">
        <div className="p-2">{tree.map((node) => renderNode(node))}</div>
      </div>
      <div className="flex-none">
        {selectedNode && (
          <FileExplorerToolbar
            selectedNode={selectedNode}
            tree={tree}
            setDrives={setDrives}
            selectedDrive={drive}
            setSelectedDrive={setSelectedDrive}
            selectedServers={drive.servers}
            userWriteRelays={userWriteRelays}
          />
        )}
        {selectedNode && selectedNode.type === "svg" && (
          <EmotionManager
            assetPath={selectedNode.path}
            assetSha256={selectedNode.sha256!}
            emotions={drive.emotions}
            onEmotionsChange={onEmotionsChange!}
          />
        )}
      </div>
    </div>
  );
};

export const buildTree = (drive: BlossomDrive): AssetNode[] => {
  // Create the root directory first
  const root: DirectoryNode = {
    name: drive.name,
    path: "/",
    type: "directory",
    children: [],
  };

  // Helper function to sort nodes
  const sortNodes = (nodes: AssetNode[]): AssetNode[] => {
    return [...nodes].sort((a, b) => a.path.localeCompare(b.path));
  };

  // Helper function to add a node and maintain sort order
  const addNodeToChildren = (parent: DirectoryNode, newNode: AssetNode) => {
    parent.children.push(newNode);
    parent.children = sortNodes(parent.children);
  };

  // Process folders first to ensure directory structure exists
  drive.folders.forEach((folderPath) => {
    const pathParts = folderPath.split("/").filter(Boolean);
    let currentNode = root;

    pathParts.forEach((part, index) => {
      let childNode = currentNode.children.find(
        (node): node is DirectoryNode =>
          node.type === "directory" && node.name === part,
      );

      if (!childNode) {
        childNode = {
          name: part,
          path: "/" + pathParts.slice(0, index + 1).join("/"),
          type: "directory",
          children: [],
        };

        addNodeToChildren(currentNode, childNode);
      }

      currentNode = childNode;
    });
  });

  // Process each file path
  drive.x.forEach((x) => {
    const pathParts = x.path.split("/").filter(Boolean);
    let currentNode = root;

    // Process each path part except the last one (which is the file)
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      let childNode = currentNode.children.find(
        (node): node is DirectoryNode =>
          node.type === "directory" && node.name === part,
      );

      if (!childNode) {
        childNode = {
          name: part,
          path: "/" + pathParts.slice(0, i + 1).join("/"),
          type: "directory",
          children: [],
        };

        addNodeToChildren(currentNode, childNode);
      }

      currentNode = childNode;
    }

    // Add the file node
    const fileName = pathParts[pathParts.length - 1];
    if (fileName.endsWith(".svg")) {
      const fileNode: SvgNode = {
        name: fileName,
        path: x.path,
        type: "svg",
        sha256: x.sha256,
        mime: "image/svg+xml",
      };

      addNodeToChildren(currentNode, fileNode);
    }
  });

  return [root];
};
