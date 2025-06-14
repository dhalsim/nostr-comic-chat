import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";

import { getOrAddCache, addHours, clearCache } from "@services/cacheService";
import type {
  ChannelWithPinned,
  ChannelMetadata,
} from "@services/channelService";
import {
  fetchPinnedChannels,
  fetchChannelMetadata,
} from "@services/channelService";
import type { RelayUrl } from "@services/types";

import { CreateUpdateChannelModal } from "./CreateUpdateChannelModal";

interface ChannelListModalProps {
  userReadRelays: RelayUrl[];
  userWriteRelays: RelayUrl[];
  pubkey: string;
  onClose: () => void;
  openedChannels: ChannelMetadata[];
  onAddOpened: (channel: ChannelMetadata) => void;
}

export const ChannelListModal = ({
  userReadRelays,
  userWriteRelays,
  pubkey,
  onClose,
  openedChannels,
  onAddOpened,
}: ChannelListModalProps) => {
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  const [filterComicRooms, setFilterComicRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [channels, setChannels] = useState<ChannelWithPinned[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<ChannelWithPinned[]>(
    [],
  );
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMyChannels, setShowMyChannels] = useState(false);
  const [channelToUpdate, setChannelToUpdate] =
    useState<ChannelMetadata | null>(null);

  const fetch = async (forceRefresh: boolean = false) => {
    setIsFetchingChannels(true);

    const params = {
      userWriteRelays,
      pubkey,
    };

    const metadataParams = {
      fetchRelays: Array.from(new Set([...userReadRelays, ...userWriteRelays])),
      userPubkey: pubkey,
    };

    try {
      // Clear caches if this is a force refresh
      if (forceRefresh) {
        clearCache({ type: "pinned", ...params });
        clearCache({ type: "metadata", ...metadataParams });
      }

      // Cache pinned channels separately
      const pinnedResult = await getOrAddCache(
        { type: "pinned", ...params },
        addHours(1),
        () => fetchPinnedChannels(params),
      );

      // Cache channel metadata separately
      const metadataResult = await getOrAddCache(
        { type: "metadata", ...metadataParams },
        addHours(1),
        () => fetchChannelMetadata(metadataParams),
      );

      // Combine the results
      const pinnedSet = new Set(pinnedResult.data);
      const channels = metadataResult.data.map((channel) => ({
        channel,
        pinned: pinnedSet.has(channel.id),
      }));

      setChannels(channels);

      // Use the most recent cache time for display
      const latestCacheTime =
        pinnedResult.createdAt > metadataResult.createdAt
          ? pinnedResult.createdAt
          : metadataResult.createdAt;

      setLastFetchTime(latestCacheTime);
      setIsFromCache(pinnedResult.fromCache && metadataResult.fromCache);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setIsFetchingChannels(false);
    }
  };

  // Filter channels automatically when dependencies change
  useEffect(() => {
    let filtered = channels;

    // Apply comic filter if enabled
    if (filterComicRooms) {
      filtered = filtered.filter((elem) => {
        const hasTags = elem.channel.tags?.some(
          (tag) => tag[0] === "t" && tag[1] === "comic-chat",
        );

        return hasTags;
      });
    }

    // Apply my channels filter
    if (showMyChannels) {
      filtered = filtered.filter((elem) => elem.channel.isUserCreated);
    }

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter(
        (elem) =>
          elem.channel.name.toLowerCase().includes(query) ||
          elem.channel.about.toLowerCase().includes(query) ||
          elem.channel.tags?.some((tag) =>
            tag.some((t) => t.toLowerCase().includes(query)),
          ) ||
          elem.channel.id === query,
      );
    }

    setFilteredChannels(filtered);
  }, [channels, filterComicRooms, searchQuery, showMyChannels]);

  const handleOpenChannel = (channel: ChannelMetadata) => {
    // Add to opened channels list
    onAddOpened(channel);
  };

  const handleRefresh = () => {
    fetch(true); // Force refresh
  };

  const handleChannelCreated = async (channelId: string) => {
    // Force refresh to get the new channel
    await fetch(true);
    // Optionally auto-open the created channel
    const createdChannel = channels.find((c) => c.channel.id === channelId);
    if (createdChannel) {
      onAddOpened(createdChannel.channel);
    }
  };

  const handleUpdateChannel = (channel: ChannelMetadata) => {
    setChannelToUpdate(channel);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setChannelToUpdate(null);
  };

  const ChannelItem = ({ channel, pinned }: ChannelWithPinned) => {
    const isOpened = openedChannels.some((c) => c.id === channel.id);

    return (
      <div
        key={channel.id}
        className={`w-full text-left p-3 border rounded transition-colors ${
          isOpened ? "bg-green-50 border-green-200" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => handleOpenChannel(channel)}
            className="font-medium hover:text-blue-600 flex-1 text-left"
          >
            {channel.name}
          </button>
          {pinned && <span className="text-xs text-blue-500">📌 Pinned</span>}
          {channel.isUserCreated && (
            <>
              <span className="text-xs text-purple-600">👤 Mine</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateChannel(channel);
                }}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              >
                Update
              </button>
            </>
          )}
          {isOpened && <span className="text-xs text-green-600">✓ Opened</span>}
        </div>
        {channel.about && (
          <div className="text-sm text-gray-500 mb-2">{channel.about}</div>
        )}
        {channel.relays && channel.relays.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {channel.relays.map((relay: string) => (
              <span
                key={relay}
                className="text-xs bg-gray-100 px-2 py-1 rounded"
              >
                {relay}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetch();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Channels</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              + Create
            </button>
            {isFetchingChannels && (
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {lastFetchTime && !isFetchingChannels && (
              <span className="text-xs text-gray-500">
                {isFromCache ? "Cached" : "Updated"}{" "}
                {lastFetchTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isFetchingChannels}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh channels"
            >
              <svg
                className={`w-4 h-4 ${isFetchingChannels ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {channels.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => {
                setSearchQuery(e.currentTarget.value);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="mb-4 space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filterComicRooms}
              onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => {
                setFilterComicRooms(e.currentTarget.checked);
              }}
              className="mr-2"
            />
            <span>Filter Comic Chat Rooms</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showMyChannels}
              onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => {
                setShowMyChannels(e.currentTarget.checked);
              }}
              className="mr-2"
            />
            <span>Show My Channels Only</span>
          </label>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredChannels.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Available Channels
              </h3>
              <div className="space-y-2">
                {filteredChannels.map((el) => (
                  <ChannelItem
                    key={el.channel.id}
                    channel={el.channel}
                    pinned={el.pinned}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredChannels.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No channels found matching your search
            </div>
          )}
        </div>
      </div>

      {(showCreateModal || channelToUpdate) && (
        <CreateUpdateChannelModal
          userWriteRelays={userWriteRelays}
          pubkey={pubkey}
          onClose={handleCloseModal}
          onChannelCreated={handleChannelCreated}
          channelToUpdate={channelToUpdate || undefined}
        />
      )}
    </div>
  );
};
