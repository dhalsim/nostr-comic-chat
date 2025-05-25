import { NostrEvent, SimplePool } from "nostr-tools";

import {
  asRelayUrl,
  asServer,
  type BlossomDrive,
  type RelayUrl,
  type Server,
  type ServerOption,
  type UserRelay,
} from "./types";

export const DEFAULT_METADATA_QUERY_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.nos.social",
  "wss://user.kindpag.es",
];

export const DEFAULT_RELAYLIST_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.nos.social",
  "wss://user.kindpag.es",
];

export const FALLBACK_RELAYS = [
  "wss://relay.nostr.band",
  "wss://relay.damus.io",
  "wss://relay.snort.net",
];

export type BlossomServerCache = {
  pubkey: string;
  servers: ServerOption[];
  timestamp: number;
};

type UpdateDriveParams = {
  updatedDrive: BlossomDrive;
  selectedDrive: BlossomDrive;
  selectedServers: Server[];
  userWriteRelays: RelayUrl[];
  setDrives: (drives: BlossomDrive[]) => void;
  setSelectedDrive: (drive: BlossomDrive) => void;
}

export class NostrService {
  private pool: SimplePool;
  private blossomServerCache: Map<string, BlossomServerCache>;
  private userRelayListCache: Map<string, UserRelay[]>;

  constructor() {
    this.pool = new SimplePool();
    this.blossomServerCache = new Map();
    this.userRelayListCache = new Map();
  }

  async getUserRelayList(pubkey: string): Promise<UserRelay[]> {
    if (this.userRelayListCache.has(pubkey)) {
      return this.userRelayListCache.get(pubkey) || [];
    }

    const nip65 = await this.pool.get(DEFAULT_RELAYLIST_RELAYS, {
      authors: [pubkey],
      kinds: [10002],
    });

    if (nip65) {
      const relays = nip65.tags
        .filter((tag) => tag[0] === "r")
        .map((tag) => ({
          url: asRelayUrl(tag[1]),
          read: tag[2] === "read" || !tag[2],
          write: tag[2] === "write" || !tag[2],
        }));

      this.userRelayListCache.set(pubkey, relays);

      return relays;
    }

    return FALLBACK_RELAYS.map((relay) => ({
      url: asRelayUrl(relay),
      read: true,
      write: true,
    }));
  }

  async getPubkeyHex(): Promise<string | null> {
    if (!window.nostr) {
      return null;
    }

    try {
      console.log("getting pubkey");

      const pubkey = await window.nostr.getPublicKey();

      return pubkey;
    } catch (error) {
      if (
        (error as Error).message ===
        "Nostr extension took over, please retry the operation"
      ) {
        // Retry the operation since the extension is now available
        return await window.nostr.getPublicKey();
      }

      console.error("Failed to get pubkey:", error);

      return null;
    }
  }

  async getBlossomServers(userRelayList: UserRelay[]): Promise<ServerOption[]> {
    const pubkey = await this.getPubkeyHex();

    if (!pubkey) {
      return [];
    }

    if (this.blossomServerCache.has(pubkey)) {
      const cache = this.blossomServerCache.get(pubkey);

      if (cache && cache.timestamp > Date.now() - 1000 * 60 * 60 * 24) {
        return cache.servers;
      }
    }

    const defaultServers = [
      "https://nostr.build/",
      "https://nostrcheck.me/",
      "https://satellite.earth/",
      "https://files.v0l.io/",
      "https://blossom.primal.net/",
    ];

    const userWriteRelays = userRelayList
      .filter((relay) => relay.write)
      .map((relay) => relay.url.toString());

    console.log(
      "userWriteRelays for fetching Blossom servers",
      userWriteRelays,
    );

    try {
      // Query for user blossom servers event
      const userBlossomServersEvent = await this.pool.get(userWriteRelays, {
        kinds: [10063],
        authors: [pubkey],
        limit: 1,
      });

      if (userBlossomServersEvent) {
        const servers = userBlossomServersEvent.tags
          .filter((tag) => tag[0] === "server")
          .map((tag) => tag[1]);

        // Filter out default servers that are already in the user's list
        const uniqueDefaultServers = defaultServers.filter(
          (defaultServer) => !servers.includes(defaultServer),
        );

        const allServers: ServerOption[] = servers
          .map((server): ServerOption => [asServer(server), true])
          .concat(
            uniqueDefaultServers.map(
              (server): ServerOption => [asServer(server), false],
            ),
          );

        this.blossomServerCache.set(pubkey, {
          pubkey,
          servers: allServers,
          timestamp: Date.now(),
        });

        return allServers;
      } else {
        // Default servers if no list is found
        const ds: ServerOption[] = defaultServers.map((server) => [
          asServer(server),
          false,
        ]);

        this.blossomServerCache.set(pubkey, {
          pubkey,
          servers: ds,
          timestamp: Date.now(),
        });

        return ds;
      }
    } catch (error) {
      console.error("Failed to get Blossom servers:", error);

      return [];
    }
  }

  async getBlossomDrives(userWriteRelays: string[]): Promise<BlossomDrive[]> {
    const pubkey = await this.getPubkeyHex();

    if (!pubkey) {
      return [];
    }

    const drives = await this.pool.querySync(userWriteRelays, {
      kinds: [30563],
      authors: [pubkey],
    });

    // deduplicate drives by unique d values, gets the latest one
    const driveMap = new Map<string, NostrEvent>();
    drives.forEach((drive) => {
      const d = drive.tags.find((tag) => tag[0] === "d")?.[1];
      
      if (d) {
        if (!driveMap.has(d)) {
          driveMap.set(d, drive);
        } else {
          const existingDrive = driveMap.get(d);
          
          if (existingDrive && existingDrive.created_at < drive.created_at) {
            driveMap.set(d, drive);
          }
        }
      }
    });

    return Array.from(driveMap.values()).map((drive) => {
      const name = drive.tags.find((tag) => tag[0] === "name")?.[1] || "";
      const description =
        drive.tags.find((tag) => tag[0] === "description")?.[1] || "";
      const d = drive.tags.find((tag) => tag[0] === "d")?.[1] || "";
      const servers = drive.tags
        .filter((tag) => tag[0] === "server")
        .map((tag) => asServer(tag[1]));
      const folders = drive.tags
        .filter((tag) => tag[0] === "folder")
        .map((tag) => tag[1]);
      const x = drive.tags
        .filter((tag) => tag[0] === "x")
        .map((tag) => {
          const sha256 = tag[1];
          const path = tag[2];
          const size = parseInt(tag[3], 10);
          const mime = tag[4];

          return {
            sha256,
            path,
            size,
            mime,
          };
        });

      // Parse emotions from tags
      const emotions = drive.tags
        .filter((tag) => tag[0] === "emotion")
        .map((tag) => ({
          name: tag[1],
          keywords: tag.slice(2),
        }));

      return {
        id: drive.id,
        name,
        description,
        servers,
        d,
        folders,
        x,
        emotions,
      };
    });
  }

  async publishBlossomDrive(
    drive: BlossomDrive,
    servers: Server[],
    userWriteRelays: RelayUrl[],
  ): Promise<void> {
    const pubkey = await this.getPubkeyHex();

    if (!pubkey) {
      throw new Error("No pubkey available");
    }

    if (!window.nostr) {
      throw new Error("No nostr instance available");
    }

    try {
      const event = {
        kind: 30563,
        created_at: Math.floor(Date.now() / 1000),
        pubkey,
        content: "",
        tags: [
          ["name", drive.name],
          ["description", drive.description],
          ["d", drive.d],
          ...servers.map((server) => ["server", server.toString()]),
          ...drive.folders.map((folder) => ["folder", folder]),
          ...drive.x.map((x) => [
            "x",
            x.sha256,
            x.path,
            x.size.toString(),
            x.mime,
          ]),
          ...drive.emotions.map((emotion) => [
            "emotion",
            emotion.name,
            ...emotion.keywords,
          ]),
        ],
      };

      const signedEvent = await window.nostr.signEvent(event);

      await this.pool.publish(
        userWriteRelays.map((relay) => relay.toString()),
        signedEvent,
      );
    } catch (error) {
      console.error("Failed to publish Blossom drive:", error);

      throw error;
    }
  }

  async publishBlossomServers(
    selectedBlossomServers: Server[],
    userWriteRelays: RelayUrl[],
  ): Promise<void> {
    const pubkey = await this.getPubkeyHex();

    if (!pubkey) {
      throw new Error("No pubkey available");
    }

    if (!window.nostr) {
      throw new Error("No nostr instance available");
    }

    try {
      const event = {
        kind: 10063,
        created_at: Math.floor(Date.now() / 1000),
        pubkey,
        content: "",
        tags: selectedBlossomServers.map((server) => [
          "server",
          server.toString(),
        ]),
      };

      const signedEvent = await window.nostr.signEvent(event);

      await this.pool.publish(
        userWriteRelays.map((relay) => relay.toString()),
        signedEvent,
      );
    } catch (error) {
      console.error("Failed to set Blossom servers:", error);

      throw error;
    }
  }

  async updateDrive({ updatedDrive, selectedDrive, selectedServers, userWriteRelays, setDrives, setSelectedDrive }: UpdateDriveParams) {
    // Publish the updated drive
    await nostrService.publishBlossomDrive(
      updatedDrive,
      selectedServers,
      userWriteRelays,
    );
  
    const modifiedDrives = await nostrService.getBlossomDrives(userWriteRelays);
  
    // Update the selected drive
    setDrives(modifiedDrives);
    setSelectedDrive(modifiedDrives.find((drive) => drive.name === selectedDrive.name)!);
  };
}

export const nostrService = new NostrService();
