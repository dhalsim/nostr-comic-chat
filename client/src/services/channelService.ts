import type { NostrEvent } from "nostr-tools";

import { pool, signEvent } from "./nostrService";
import type { RelayUrl } from "./types";

type FetchChannelResult = {
  create?: NostrEvent;
  update?: NostrEvent;
};

export type ChannelMetadata = {
  id: string;
  name: string;
  about: string;
  picture: string;
  relays: RelayUrl[];
  owner: string;
  created_at: number;
  tags?: string[][];
  updated_at?: number;
};

export type ChannelWithPinned = {
  channel: ChannelMetadata;
  pinned: boolean;
};

type FetchPinnedChannelsParams = {
  userReadRelays: RelayUrl[];
  pubkey: string;
};

/**
 * Fetches the user's pinned channel list (kind 10005)
 */
export const fetchPinnedChannels = async ({
  userReadRelays,
  pubkey,
}: FetchPinnedChannelsParams): Promise<string[]> => {
  const joinedEvents = await pool.querySync(
    userReadRelays,
    { kinds: [10005], authors: [pubkey] },
    { maxWait: 1000 },
  );

  const latestJoinedEvent =
    joinedEvents.length > 0
      ? joinedEvents.reduce((latestEvent, event) =>
          latestEvent.created_at < event.created_at ? event : latestEvent,
        )
      : null;

  return latestJoinedEvent
    ? latestJoinedEvent.tags
        .filter((tag) => tag[0] === "e")
        .map((tag) => tag[1])
    : [];
};

type FetchChannelsParams = {
  userReadRelays: RelayUrl[];
};

/**
 * Fetches all channel metadata (kinds 40, 41)
 */
export const fetchChannelMetadata = async ({
  userReadRelays,
}: FetchChannelsParams): Promise<ChannelMetadata[]> => {
  const eventMap = new Map<string, FetchChannelResult>();
  const channels: ChannelMetadata[] = [];

  return new Promise<ChannelMetadata[]>((resolve, reject) => {
    const sub = pool.subscribe(
      userReadRelays,
      { kinds: [40, 41] },
      {
        onevent: (event) => {
          if (event.kind === 40) {
            const e = eventMap.get(event.id);

            if (!e) {
              const eventData = { create: event };
              eventMap.set(event.id, eventData);

              const channel = parseChannelEvent(event);
              if (channel) {
                channels.push(channel);
              }
            } else if (e.update && e.update.pubkey === event.pubkey) {
              const eventData = { create: event, update: e.update };
              eventMap.set(event.id, eventData);

              const channel = parseChannelEvent(event, e.update);
              if (channel) {
                // Replace existing channel
                const index = channels.findIndex((c) => c.id === channel.id);
                if (index >= 0) {
                  channels[index] = channel;
                } else {
                  channels.push(channel);
                }
              }
            }
          } else if (event.kind === 41) {
            const eId = event.tags.find((tag) => tag[0] === "e")?.[1];

            if (!eId) {
              return;
            }

            const e = eventMap.get(eId);

            if (e && e.create && e.create.pubkey === event.pubkey) {
              const eventData = { create: e.create, update: event };
              eventMap.set(eId, eventData);

              const channel = parseChannelEvent(e.create, event);
              if (channel) {
                // Replace existing channel
                const index = channels.findIndex((c) => c.id === channel.id);
                if (index >= 0) {
                  channels[index] = channel;
                } else {
                  channels.push(channel);
                }
              }
            } else if (!e) {
              const eventData = { update: event };
              eventMap.set(eId, eventData);
            }
          }
        },
        oneose: () => {
          resolve(channels);
          sub.close();
        },
        onclose: (reasons) => {
          console.warn("Channel subscription closed", reasons);
          reject(new Error("Channel subscription closed"));
        },
      },
    );
  });
};

type UpdatePinnedChannelsParams = {
  userWriteRelays: RelayUrl[];
  pubkey: string;
  channelIds: string[];
};

/**
 * Updates the user's pinned channel list
 */
export const updatePinnedChannels = async (
  params: UpdatePinnedChannelsParams,
): Promise<void> => {
  console.log("Updating pinned channels:", params.channelIds);

  const event = {
    kind: 10005,
    pubkey: params.pubkey,
    tags: params.channelIds.map((id) => ["e", id]),
    created_at: Math.floor(Date.now() / 1000),
    content: "",
  };

  const signedEvent = await signEvent(event);

  if (!signedEvent) {
    throw new Error("Failed to sign event");
  }

  pool.publish(params.userWriteRelays, signedEvent);
};

export const parseChannelEvent = (
  create: NostrEvent,
  update?: NostrEvent,
): ChannelMetadata | null => {
  try {
    let content = JSON.parse(create.content);

    if (update) {
      content = JSON.parse(update.content);
    }

    return {
      id: create.id,
      name: content.name || "",
      about: content.about || "",
      picture: content.picture || "",
      relays: Array.from(content.relays || []) || [],
      owner: create.pubkey,
      created_at: create.created_at,
      tags: update?.tags,
      updated_at: update?.created_at,
    };
  } catch (error) {
    if (update) {
      console.error(
        `Error parsing channel metadata: create: ${create.id}, update: ${update.id}`,
        error,
      );
    } else {
      console.error(
        `Error parsing channel metadata: create: ${create.id}`,
        error,
      );
    }

    return null;
  }
};
