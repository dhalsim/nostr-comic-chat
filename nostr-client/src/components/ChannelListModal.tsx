import type { JSX } from "preact";
import { useState } from "preact/hooks";

import type {
  ChannelMetadata,
  UpdatedChannelMetadata,
} from "../services/channelService";

interface ChannelListModalProps {
  channelList: Map<string, ChannelMetadata | UpdatedChannelMetadata>;
  onClose: () => void;
  userPublicJoinedChannelIds: string[];
}

export const ChannelListModal = ({
  onClose,
  channelList,
  userPublicJoinedChannelIds,
}: ChannelListModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const channels = Array.from(channelList.values());

  // Split channels into joined and available
  const joinedChannels = channels.filter((channel) =>
    userPublicJoinedChannelIds.includes(channel.id),
  );
  const availableChannels = channels.filter(
    (channel) => !userPublicJoinedChannelIds.includes(channel.id),
  );

  // Filter channels based on search query
  const filterChannels = (
    channelList: (ChannelMetadata | UpdatedChannelMetadata)[],
  ) => {
    if (!searchQuery) {
      return channelList;
    }

    const query = searchQuery.toLowerCase();

    return channelList.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.about.toLowerCase().includes(query) ||
        (channel as UpdatedChannelMetadata).tags?.some((tag) =>
          tag.toLowerCase().includes(query),
        ) ||
        channel.id === query,
    );
  };

  const filteredJoinedChannels = filterChannels(joinedChannels);
  const filteredAvailableChannels = filterChannels(availableChannels);

  const ChannelItem = ({ channel }: { channel: ChannelMetadata }) => (
    <div
      key={channel.id}
      className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
    >
      <div className="font-medium">{channel.name}</div>
      {channel.about && (
        <div className="text-sm text-gray-500">{channel.about}</div>
      )}
      {channel.relays && channel.relays.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {channel.relays.map((relay) => (
            <span key={relay} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {relay}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Channels</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
              setSearchQuery(e.currentTarget.value)
            }
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredJoinedChannels.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Joined Channels
              </h3>
              <div className="space-y-2">
                {filteredJoinedChannels.map((channel) => (
                  <ChannelItem key={channel.id} channel={channel} />
                ))}
              </div>
            </div>
          )}

          {filteredAvailableChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Available Channels
              </h3>
              <div className="space-y-2">
                {filteredAvailableChannels.map((channel) => (
                  <ChannelItem key={channel.id} channel={channel} />
                ))}
              </div>
            </div>
          )}

          {filteredJoinedChannels.length === 0 &&
            filteredAvailableChannels.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No channels found matching your search
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
