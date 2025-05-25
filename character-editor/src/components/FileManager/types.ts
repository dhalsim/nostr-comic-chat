export type BaseAssetNode = {
  name: string;
  path: string;
};

export type SvgNode = BaseAssetNode & {
  type: "svg";
  sha256: string;
  mime: string;
};

export type DirectoryNode = BaseAssetNode & {
  type: "directory";
  children: AssetNode[];
};

export type AssetNode = SvgNode | DirectoryNode;

export interface BlobResult {
  sha256: string;
  blob: Blob;
}

export type FileSource =
  | { type: "file"; file: File }
  | { type: "url"; url: string }
  | { type: "hash"; hash: string; name: string };
