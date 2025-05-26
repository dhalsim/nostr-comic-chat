import { nostrService, type NostrService } from "./nostrService";
import type { BlossomDrive, Server } from "./types";

export type BlobDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
};

export class BlossomService {
  private nostrService: NostrService;

  constructor(nostrService: NostrService) {
    this.nostrService = nostrService;
  }

  async fetchDrive(
    drive: BlossomDrive,
  ): Promise<PromiseSettledResult<{ sha256: string; blob: Blob }>[]> {
    return Promise.allSettled(
      drive.x.map(async (x) => {
        const { blob } = await this.fetchFile(x.sha256, drive.servers, x.mime);

        return {
          sha256: x.sha256,
          blob,
        };
      }),
    );
  }

  async fetchFile(
    sha256: string,
    servers: Server[],
    mime?: string,
  ): Promise<{ blob: Blob; size: number; url: string; sha256: string }> {
    const getExtension = (mime?: string): string => {
      if (!mime) {
        return "";
      }

      if (mime.includes("svg")) {
        return ".svg";
      }

      return `.${mime.split("/")[1]}`;
    };

    const resultArr = await Promise.allSettled([
      ...servers.map((server) => {
        const url = server.endsWith("/") ? server.slice(0, -1) : server;

        return fetch(`${url}/${sha256}` + getExtension(mime));
      }),
    ]);

    const result = resultArr
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .find((r) => r.ok);

    if (result) {
      console.log(`successfully fetched file ${sha256} from ${result.url}`);

      const blob = await result.blob();
      const size = blob.size;

      const contentType = result.headers.get("content-type");

      if (mime && contentType !== mime) {
        throw new Error(
          `Invalid content type of ${contentType}, from ${result.url}`,
        );
      }

      // verify sha256 hash of the blob
      const hash = await crypto.subtle.digest(
        "SHA-256",
        await blob.arrayBuffer(),
      );

      const hashString = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const url = result.url;

      if (hashString === sha256) {
        return {
          blob,
          size,
          url,
          sha256,
        };
      } else {
        throw new Error(`Invalid file hash of ${sha256}, from ${result.url}`);
      }
    }

    throw new Error(`Failed to fetch file ${sha256} from ${servers}`);
  }

  async deleteFile(
    sha256: string,
    servers: Server[],
  ): Promise<PromiseSettledResult<{ sha256: string; server: Server }>[]> {
    const auth = await this.getBlossomAuthForDeleteBlobs(sha256);

    if (!auth) {
      throw new Error("Failed to get Blossom auth for delete blobs");
    }

    return Promise.allSettled(
      servers.map(async (server) => {
        const url = server.endsWith("/") ? server.slice(0, -1) : server;

        const response = await fetch(`${url}/delete`, {
          headers: {
            Authorization: `Nostr ${auth}`,
          },
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file ${sha256} from ${server}`);
        }

        return { sha256, server };
      }),
    );
  }

  async getBlossomAuthForDeleteBlobs(sha256: string): Promise<string | null> {
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
      content: "Delete Blobs",
      tags: [
        ["t", "delete"],
        ["x", sha256],
        [
          "expiration",
          (Math.floor(Date.now() / 1000) + ONE_DAY_IN_SECONDS).toString(),
        ],
      ],
      pubkey,
    };

    const signedAuthEvent = await window.nostr.signEvent(authEvent);

    return btoa(JSON.stringify(signedAuthEvent));
  }

  async getBlossomAuthForListBlobs(): Promise<string | null> {
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

    return btoa(JSON.stringify(signedAuthEvent));
  }

  async getBlossomAuthForUploadBlobs(blob: Blob): Promise<string | null> {
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

    return btoa(JSON.stringify(signedAuthEvent));
  }

  async getBlossomAuthForMirrorUrls(url: string): Promise<string | null> {
    const pubkey = await this.nostrService.getPubkeyHex();

    if (!pubkey) {
      return null;
    }

    if (!window.nostr) {
      return null;
    }

    const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

    const sha256 = url.split("/").pop()?.split(".")[0];

    if (!sha256) {
      return null;
    }

    const authEvent = {
      kind: 24242,
      created_at: Math.floor(Date.now() / 1000),
      content: "Mirror Url",
      tags: [
        ["t", "upload"],
        ["x", sha256],
        [
          "expiration",
          (Math.floor(Date.now() / 1000) + ONE_DAY_IN_SECONDS).toString(),
        ],
      ],
      pubkey,
    };

    const signedAuthEvent = await window.nostr.signEvent(authEvent);

    return btoa(JSON.stringify(signedAuthEvent));
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

  async mirrorFile(
    url: string,
    servers: string[],
  ): Promise<PromiseSettledResult<BlobDescriptor>[]> {
    const auth = await this.getBlossomAuthForMirrorUrls(url);

    return Promise.allSettled(
      servers.map(async (server) => {
        const serverUrl = server.endsWith("/") ? server.slice(0, -1) : server;

        const response = await fetch(`${serverUrl}/mirror`, {
          headers: {
            Authorization: `Nostr ${auth}`,
          },
          method: "PUT",
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error(`Failed to mirror file from ${url} to ${server}`);
        }

        return response.json() as Promise<BlobDescriptor>;
      }),
    );
  }
}

export const blossomService = new BlossomService(nostrService);
