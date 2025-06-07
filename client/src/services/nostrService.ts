import type { NostrEvent } from "nostr-tools";
import { SimplePool } from "nostr-tools";

import {
  asRelayUrl,
  asServer,
  type BlossomDrive,
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

export const pool = new SimplePool();

export const signEvent = async (
  event: Omit<NostrEvent, "id" | "sig">,
): Promise<NostrEvent | null> => {
  if (!window.nostr) {
    return null;
  }

  const signedEvent = await window.nostr.signEvent(event);

  return signedEvent;
};

export const getUserRelayList = async (
  pubkey: string,
): Promise<UserRelay[]> => {
  const nip65 = await pool.get(DEFAULT_RELAYLIST_RELAYS, {
    authors: [pubkey],
    kinds: [10002],
  });

  let relays = [];

  if (nip65) {
    relays = nip65.tags
      .filter((tag) => tag[0] === "r")
      .map((tag) => ({
        url: asRelayUrl(tag[1]),
        read: tag[2] === "read" || !tag[2],
        write: tag[2] === "write" || !tag[2],
      }));
  } else {
    relays = FALLBACK_RELAYS.map((relay) => ({
      url: asRelayUrl(relay),
      read: true,
      write: true,
    }));
  }

  return relays.concat([
    {
      url: asRelayUrl("ws://localhost:3334"),
      read: true,
      write: true,
    },
  ]);
};

export const getPubkeyHex = async (): Promise<string | null> => {
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
};

export const getBlossomServers = async (
  userRelayList: UserRelay[],
): Promise<ServerOption[]> => {
  const pubkey = await getPubkeyHex();

  if (!pubkey) {
    return [];
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

  console.log("userWriteRelays for fetching Blossom servers", userWriteRelays);

  try {
    // Query for user blossom servers event
    const userBlossomServersEvent = await pool.get(userWriteRelays, {
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

      return allServers;
    } else {
      // Default servers if no list is found
      const ds: ServerOption[] = defaultServers.map((server) => [
        asServer(server),
        false,
      ]);

      return ds;
    }
  } catch (error) {
    console.error("Failed to get Blossom servers:", error);

    return [];
  }
};

export const getBlossomDrives = async (
  userWriteRelays: string[],
): Promise<BlossomDrive[]> => {
  const pubkey = await getPubkeyHex();

  if (!pubkey) {
    return [];
  }

  const drives = await pool.querySync(userWriteRelays, {
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
};
