import type { NostrEvent } from "nostr-tools";
import { SimplePool } from "nostr-tools";

import type { RelayUrl } from "./types";

export type ChannelMetadata = {
  id: string;
  name: string;
  about: string;
  picture: string;
  relays: RelayUrl[];
  owner: string;
  created_at: number;
};

export type UpdateChannelMetadata = {
  name: string;
  about: string;
  picture: string;
  relays: RelayUrl[];
  tags: string[];
  updated_at: number;
};

export type ChannelStats = {
  num_members?: number;
  num_posts?: number;
  num_reactions?: number;
  total_zap_amount?: number;
};

export type UpdatedChannelMetadata = ChannelMetadata & UpdateChannelMetadata;

export type SubscribeToChannelsParams = {
  pubkey: string;
  relays: RelayUrl[];
  setUserPublicJoinedChannelIds: (channels: string[]) => void;
  setChannelList: (channels: Map<string, ChannelMetadata>) => void;
  updateChannel: (id: string, channel: UpdateChannelMetadata) => void;
};

export class ChannelService {
  public pool: SimplePool;

  constructor() {
    this.pool = new SimplePool();
  }

  async subscribeToChannels({
    pubkey,
    relays,
    setUserPublicJoinedChannelIds,
    setChannelList,
    updateChannel,
  }: SubscribeToChannelsParams) {
    const userPublicJoinedChannelIds = (
      await this.pool.querySync(relays, {
        kinds: [10005],
        authors: [pubkey],
      })
    ).flatMap((evt) =>
      evt.tags.filter((tag) => tag[0] === "e").map((tag) => tag[1]),
    );

    setUserPublicJoinedChannelIds(userPublicJoinedChannelIds);

    const channelEvents = await this.pool.querySync(relays, {
      kinds: [40],
    });

    const channels = channelEvents.reduce(
      (acc: Map<string, ChannelMetadata>, channel: NostrEvent) => {
        let content: Partial<ChannelMetadata> = {};

        try {
          content = JSON.parse(channel.content);
        } catch (error) {
          console.error(`Error parsing channel metadata: ${channel.id}`, error);

          return acc;
        }

        const channelMetadata: ChannelMetadata = {
          id: channel.id,
          name: content.name || "",
          about: content.about || "",
          picture: content.picture || "",
          relays: Array.from(content.relays || []) || [],
          owner: channel.pubkey,
          created_at: channel.created_at,
        };

        acc.set(channel.id, channelMetadata);

        return acc;
      },
      new Map<string, ChannelMetadata>(),
    );

    setChannelList(channels);

    const channelRelays = new Set(
      Array.from(channels.values()).flatMap((channel) => channel.relays),
    );

    this.pool.subscribe(
      Array.from(channelRelays),
      {
        kinds: [41],
      },
      {
        onevent(evt) {
          const channel = channels.get(evt.id);

          if (!channel) {
            return;
          }

          const content = JSON.parse(evt.content);

          if (channel && evt.pubkey === channel.owner) {
            const channelMetadata: UpdateChannelMetadata = {
              name: content.name || "",
              about: content.about || "",
              picture: content.picture || "",
              relays: content.relays || [],
              tags: evt.tags
                .filter((tag) => tag[0] === "t")
                .map((tag) => tag[1]),
              updated_at: evt.created_at,
            };

            updateChannel(channel.id, channelMetadata);
          }
        },
      },
    );
  }
}

export const channelService = new ChannelService();
