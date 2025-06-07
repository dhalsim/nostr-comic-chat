import { useEffect, useState } from "preact/hooks";

import { getOrAddCache, addHours, clearCache } from "@services/cacheService";
import type {
  ChannelWithPinned,
  ChannelMetadata,
} from "@services/channelService";
import {
  fetchPinnedChannels,
  fetchChannelMetadata,
  updatePinnedChannels,
} from "@services/channelService";
import type { RelayUrl } from "@services/types";

interface OpenedChannelsProps {
  userReadRelays: RelayUrl[];
  userWriteRelays: RelayUrl[];
  pubkey: string;
  selectedChannelId: string | null;
  onChannelSelect: (channel: ChannelWithPinned) => void;
  openedChannels: ChannelMetadata[];
  setOpenedChannels: (channels: ChannelMetadata[]) => void;
}

export const OpenedChannels = ({
  userReadRelays,
  userWriteRelays,
  pubkey,
  selectedChannelId,
  onChannelSelect,
  openedChannels,
  setOpenedChannels,
}: OpenedChannelsProps) => {
  const [pinnedChannels, setPinnedChannels] = useState<ChannelWithPinned[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPinned = async () => {
    setIsLoading(true);

    const params = {
      userReadRelays,
      pubkey,
    };

    try {
      // Cache pinned channels separately
      const pinnedResult = await getOrAddCache(
        { type: "pinned", ...params },
        addHours(1),
        () => fetchPinnedChannels(params),
      );

      // Cache channel metadata separately
      const metadataResult = await getOrAddCache(
        { type: "metadata", userReadRelays },
        addHours(1),
        () => fetchChannelMetadata({ userReadRelays }),
      );

      // Combine and filter only pinned channels
      const pinnedSet = new Set(pinnedResult.data);
      const pinned = metadataResult.data
        .filter((channel: ChannelMetadata) => pinnedSet.has(channel.id))
        .map((channel: ChannelMetadata) => ({
          channel,
          pinned: true,
        }));

      setPinnedChannels(pinned);
    } catch (error) {
      console.error("Failed to fetch pinned channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pubkey && userReadRelays.length > 0) {
      fetchPinned();
    }
  }, [pubkey, userReadRelays]);

  const handlePinToggle = async (
    channel: ChannelMetadata,
    shouldPin: boolean,
  ) => {
    try {
      const { data: currentPinned } = await getOrAddCache(
        { type: "pinned", userReadRelays, pubkey },
        addHours(1),
        () => fetchPinnedChannels({ userReadRelays, pubkey }),
      );

      let updatedPinned: string[];

      if (shouldPin) {
        updatedPinned = currentPinned.includes(channel.id)
          ? currentPinned
          : [...currentPinned, channel.id];
      } else {
        updatedPinned = currentPinned.filter((id) => id !== channel.id);
      }

      await updatePinnedChannels({
        userWriteRelays,
        pubkey,
        channelIds: updatedPinned,
      });

      // Clear pinned cache and refetch
      clearCache({ type: "pinned", userReadRelays, pubkey });

      await fetchPinned();

      // If unpinning and it's not in opened channels, add it to opened channels
      if (!shouldPin && !openedChannels.find((c) => c.id === channel.id)) {
        setOpenedChannels(openedChannels.concat(channel));
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const ChannelItem = ({
    channel,
    isPinned,
    onClick,
    onClose,
  }: {
    channel: ChannelMetadata;
    isPinned: boolean;
    onClick: () => void;
    onClose?: () => void;
  }) => {
    const isSelected = selectedChannelId === channel.id;

    return (
      <div className="relative z-0">
        <button
          onClick={onClick}
          className={`w-full text-left p-3 rounded-lg transition-colors relative z-0 ${
            isSelected
              ? "bg-blue-100 border border-blue-200"
              : "hover:bg-gray-100"
          }`}
        >
          <div className="font-medium text-sm truncate">
            {channel.name || "Unnamed Channel"}
          </div>
          {channel.about && (
            <div className="text-xs text-gray-500 truncate mt-1">
              {channel.about}
            </div>
          )}
        </button>

        <div className="absolute top-2 right-2 flex gap-1 z-0">
          {/* Close button for non-pinned channels */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-md text-xs transition-colors bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 relative z-0"
              title="Close channel"
            >
              ✕
            </button>
          )}

          {/* Pin/Unpin button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePinToggle(channel, !isPinned);
            }}
            className={`p-1 rounded-md text-xs transition-colors relative z-0 ${
              isPinned
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={isPinned ? "Unpin channel" : "Pin channel"}
          >
            {isPinned ? "📌" : "📍"}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading && pinnedChannels.length === 0 && openedChannels.length === 0) {
    return (
      <div className="w-64 bg-gray-50 border-r flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-5 w-5 text-gray-500 mx-auto mb-2"
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
          <div className="text-sm text-gray-500">Loading channels...</div>
        </div>
      </div>
    );
  }

  // Get opened channels that aren't already pinned
  const openedNotPinned = openedChannels.filter(
    (channel) => !pinnedChannels.find((p) => p.channel.id === channel.id),
  );

  const totalChannels = pinnedChannels.length + openedNotPinned.length;

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col relative z-0">
      <div className="p-4 border-b bg-white relative z-0">
        <h3 className="font-semibold text-gray-900">Opened Channels</h3>
        <div className="text-sm text-gray-500">{totalChannels} channels</div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-0">
        {totalChannels === 0 ? (
          <div className="p-4 text-center text-gray-500 relative z-0">
            <div className="text-sm">No channels opened</div>
            <div className="text-xs mt-1">
              Use the Channels button to discover and open some!
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2 relative z-0">
            {/* Pinned Channels */}
            {pinnedChannels.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Pinned
                </div>
                {pinnedChannels.map((channelWithPinned) => (
                  <ChannelItem
                    key={`pinned-${channelWithPinned.channel.id}`}
                    channel={channelWithPinned.channel}
                    isPinned={true}
                    onClick={() => onChannelSelect(channelWithPinned)}
                  />
                ))}
              </>
            )}

            {/* Recently Opened Channels */}
            {openedNotPinned.length > 0 && (
              <>
                {pinnedChannels.length > 0 && (
                  <div className="border-t border-gray-200 my-2"></div>
                )}
                <div className="px-2 py-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Recent
                </div>
                {openedNotPinned.map((channel) => (
                  <ChannelItem
                    key={`opened-${channel.id}`}
                    channel={channel}
                    isPinned={false}
                    onClick={() => onChannelSelect({ channel, pinned: false })}
                    onClose={() =>
                      setOpenedChannels(
                        openedChannels.filter((c) => c.id !== channel.id),
                      )
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
