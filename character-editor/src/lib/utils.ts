import type { SvgNode } from "../components/FileManager/types";
import type { AssetNode } from "../components/FileManager/types";

export function isFulfilled<T>(
  result: PromiseSettledResult<T>,
): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

export function isRejected<T>(
  result: PromiseSettledResult<T>,
): result is PromiseRejectedResult {
  return result.status === "rejected";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertUnreachable(
  x: never,
  message: string = "Unreachable code path",
): never {
  throw new Error(`${message}. Received value: ${JSON.stringify(x)}`);
}

export const findParentFolder = (
  svgNode: SvgNode,
  tree: AssetNode[],
): string => {
  const targetPath = svgNode.path.substring(0, svgNode.path.lastIndexOf("/"));

  const findParentNode = (nodes: AssetNode[]): AssetNode | undefined => {
    for (const node of nodes) {
      if (node.type === "directory") {
        if (node.path === targetPath) {
          return node;
        }

        const found = findParentNode(node.children);

        if (found) {
          return found;
        }
      }
    }

    return undefined;
  };

  const parent = findParentNode(tree);

  if (!parent) {
    throw new Error(`Parent folder not found for path: ${targetPath}`);
  }

  return parent.path;
};

export const getNodeByPath = (
  path: string,
  tree: AssetNode[],
): AssetNode | undefined => {
  for (const node of tree) {
    if (node.path === path) {
      return node;
    }

    if (node.type === "directory") {
      const found = getNodeByPath(path, node.children);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
};
