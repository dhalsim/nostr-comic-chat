import { useState } from "preact/hooks";

import type { ChannelMetadata } from "@services/channelService";
import type { RelayUrl } from "@services/types";

import { ChannelListModal } from "./ChannelListModal";

export type ToolbarProps = {
  pubkey: string;
  userReadRelays: RelayUrl[];
  openedChannels: ChannelMetadata[];
  onAddOpened: (channel: ChannelMetadata) => void;
};

export const Toolbar = ({
  pubkey,
  userReadRelays,
  openedChannels,
  onAddOpened,
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
          pubkey={pubkey}
          userReadRelays={userReadRelays}
          onClose={() => setIsChannelModalOpen(false)}
          openedChannels={openedChannels}
          onAddOpened={onAddOpened}
        />
      )}
    </div>
  );
};
