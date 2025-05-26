import { useState } from "preact/hooks";

import type { ChannelMetadata } from "../services/channelService";

import { ChannelListModal } from "./ChannelListModal";

export type ToolbarProps = {
  channelList: Map<string, ChannelMetadata>;
  userPublicJoinedChannelIds: string[];
};

export const Toolbar = ({
  channelList,
  userPublicJoinedChannelIds,
}: ToolbarProps) => {
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  return (
    <div className="bg-gray-100 border-b p-2 flex items-center space-x-2">
      <button
        onClick={() => setIsChannelModalOpen(true)}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Channels
      </button>

      {isChannelModalOpen && (
        <ChannelListModal
          userPublicJoinedChannelIds={userPublicJoinedChannelIds}
          onClose={() => setIsChannelModalOpen(false)}
          channelList={channelList}
        />
      )}
    </div>
  );
};
