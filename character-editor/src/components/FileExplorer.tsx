import { useEffect, useState } from "preact/hooks";

import { blossomService } from "../services/blossomService";
import type { BlossomDrive } from "../services/nostrService";

interface FileExplorerProps {
  drive: BlossomDrive;
  onAssetSelect: (path: string, sha256: string, blob: Blob) => Promise<void>;
}

interface AssetNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: AssetNode[];
  sha256?: string;
}

interface BlobResult {
  sha256: string;
  blob: Blob;
}

export const FileExplorer = ({ drive, onAssetSelect }: FileExplorerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<AssetNode[]>([]);
  const [blobResults, setBlobResults] = useState<Record<string, BlobResult>>(
    {},
  );

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

        // Build tree from drive event tags
        const tree: AssetNode[] = [];
        const paths = drive.x.map((x) => x.path);

        paths.forEach((path) => {
          const parts = path.split("/").filter(Boolean);
          let currentLevel = tree;

          parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;
            const existingNode = currentLevel.find(
              (node) => node.name === part,
            );

            if (existingNode) {
              if (isLast) {
                existingNode.type = "file";
                // Find the corresponding blob result for this path
                const driveEvent = drive.x.find((x) => x.path === path);
                if (driveEvent?.sha256) {
                  existingNode.sha256 = driveEvent.sha256;
                }
              } else {
                currentLevel = existingNode.children || [];
              }
            } else {
              const newNode: AssetNode = {
                name: part,
                path: "/" + parts.slice(0, index + 1).join("/"),
                type: isLast ? "file" : "directory",
                children: isLast ? undefined : [],
              };
              if (isLast) {
                const driveEvent = drive.x.find((x) => x.path === path);
                if (driveEvent?.sha256) {
                  newNode.sha256 = driveEvent.sha256;
                }
              }

              currentLevel.push(newNode);
              if (!isLast) {
                currentLevel = newNode.children!;
              }
            }
          });
        });

        setTree(tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drive");
        console.error("Failed to load drive:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDrive();
  }, [drive]);

  const handleFileSelect = (node: AssetNode) => {
    if (node.type === "file" && node.sha256) {
      const blobResult = blobResults[node.sha256];
      if (blobResult) {
        onAssetSelect(node.path, node.sha256, blobResult.blob);
      }
    }
  };

  const renderNode = (node: AssetNode, level: number = 0) => {
    const paddingLeft = `${level * 1.5}rem`;

    if (node.type === "directory") {
      return (
        <div key={node.path} style={{ paddingLeft }}>
          <div className="flex items-center py-1 text-sm text-gray-700">
            <span className="mr-2">📁</span>
            {node.name}
          </div>
          {node.children?.map((child) => renderNode(child, level + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        style={{ paddingLeft }}
        className="flex items-center py-1 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
        onClick={() => handleFileSelect(node)}
      >
        <span className="mr-2">📄</span>
        {node.name}
      </div>
    );
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

  return <div className="p-2">{tree.map((node) => renderNode(node))}</div>;
};
