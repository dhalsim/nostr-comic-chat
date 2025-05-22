import {
  nostrService,
  type NostrService,
  type BlossomDrive,
} from "./nostrService";

type BlobDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
};

export class BlossomService {
  private nostrService: NostrService;
  private fileCache: Record<string, Blob>;
  private authCache: Record<string, string>;

  constructor(nostrService: NostrService) {
    this.nostrService = nostrService;
    this.fileCache = {};
    this.authCache = {};
  }

  async fetchDrive(
    drive: BlossomDrive,
  ): Promise<PromiseSettledResult<{ sha256: string; blob: Blob }>[]> {
    return Promise.allSettled(
      drive.x.map(async (x) => {
        const blob = await this.fetchFile(x.sha256, drive.servers, x.mime);

        return {
          sha256: x.sha256,
          blob,
        };
      }),
    );
  }

  async fetchFile(
    sha256: string,
    servers: string[],
    mime: string,
  ): Promise<Blob> {
    if (this.fileCache[sha256]) {
      return this.fileCache[sha256];
    }

    const resultArr = await Promise.allSettled([
      ...servers.map((server) => {
        const url = server.endsWith("/") ? server.slice(0, -1) : server;
        const extension = mime.includes("svg") ? "svg" : mime.split("/")[1];

        return fetch(`${url}/${sha256}.${extension}`);
      }),
    ]);

    const result = resultArr
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .find((r) => r.ok);

    if (result) {
      console.log(`successfully fetched file ${sha256} from ${result.url}`);

      const blob = await result.blob();

      // verify sha256 hash of the blob
      const hash = await crypto.subtle.digest(
        "SHA-256",
        await blob.arrayBuffer(),
      );
      const hashString = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (hashString === sha256) {
        this.fileCache[sha256] = blob;

        return blob;
      } else {
        throw new Error(`Invalid file hash of ${sha256}, from ${result.url}`);
      }
    }

    throw new Error(`Failed to fetch file ${sha256} from ${servers}`);
  }

  async getBlossomAuthForListBlobs(): Promise<string | null> {
    if (this.authCache.listBlobs) {
      return this.authCache.listBlobs;
    }

    const pubkey = await this.nostrService.getPubkeyHex();

    if (!pubkey) {
      return null;
    }

    if (!window.nostr) {
      return null;
    }

    const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

    const authEvent = {
      kind: 24242,
      created_at: Math.floor(Date.now() / 1000),
      content: "List Blobs",
      tags: [
        ["t", "list"],
        [
          "expiration",
          (Math.floor(Date.now() / 1000) + ONE_DAY_IN_SECONDS).toString(),
        ],
      ],
      pubkey,
    };

    const signedAuthEvent = await window.nostr.signEvent(authEvent);

    this.authCache.listBlobs = btoa(JSON.stringify(signedAuthEvent));

    return this.authCache.listBlobs;
  }

  async getBlossomAuthForUploadBlobs(blob: Blob): Promise<string | null> {
    if (this.authCache.uploadBlobs) {
      return this.authCache.uploadBlobs;
    }

    const pubkey = await this.nostrService.getPubkeyHex();

    if (!pubkey) {
      return null;
    }

    if (!window.nostr) {
      return null;
    }

    const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

    const sha256 = await crypto.subtle.digest(
      "SHA-256",
      await blob.arrayBuffer(),
    );
    const sha256String = Array.from(new Uint8Array(sha256))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const authEvent = {
      kind: 24242,
      created_at: Math.floor(Date.now() / 1000),
      content: "Upload Blobs",
      tags: [
        ["t", "upload"],
        ["x", sha256String],
        [
          "expiration",
          (Math.floor(Date.now() / 1000) + ONE_DAY_IN_SECONDS).toString(),
        ],
      ],
      pubkey,
    };

    const signedAuthEvent = await window.nostr.signEvent(authEvent);

    this.authCache.uploadBlobs = btoa(JSON.stringify(signedAuthEvent));

    return this.authCache.uploadBlobs;
  }

  async uploadAsset(
    blob: Blob,
    servers: string[],
  ): Promise<PromiseSettledResult<BlobDescriptor>[]> {
    const auth = await this.getBlossomAuthForUploadBlobs(blob);

    if (!auth) {
      throw new Error("Failed to get Blossom auth for upload blobs");
    }

    return Promise.allSettled(
      servers.map(async (server) => {
        const url = server.endsWith("/") ? server.slice(0, -1) : server;

        const response = await fetch(`${url}/upload`, {
          headers: {
            Authorization: `Nostr ${auth}`,
          },
          method: "PUT",
          body: blob,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload asset to ${server}`);
        }

        return response.json() as Promise<BlobDescriptor>;
      }),
    );
  }
}

export const blossomService = new BlossomService(nostrService);
