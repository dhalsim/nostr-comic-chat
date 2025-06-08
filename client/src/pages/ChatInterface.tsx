import { useState, useEffect } from "preact/hooks";

import type {
  ChannelWithPinned,
  ChannelMetadata,
} from "@services/channelService";

import { ChatRoom } from "../components/ChatRoom";
import { OpenedChannels } from "../components/OpenedChannels";
import { Toolbar } from "../components/Toolbar";
import { useNostr } from "../hooks/useNostr";
import { getUserRelayList } from "../services/nostrService";
import type { UserRelay } from "../services/types";
import type { Message, Character } from "../types/chat";

export function ChatInterface() {
  const { pubkey, isAvailable } = useNostr();
  const [messages, _setMessages] = useState<Message[]>([]);
  const [_selectedCharacter, _setSelectedCharacter] =
    useState<Character | null>(null);
  const [userWriteRelays, setUserWriteRelays] = useState<UserRelay[]>([]);
  const [userReadRelays, setUserReadRelays] = useState<UserRelay[]>([]);
  const [selectedChannel, setSelectedChannel] =
    useState<ChannelWithPinned | null>(null);
  const [openedChannels, setOpenedChannels] = useState<ChannelMetadata[]>([]);

  useEffect(() => {
    if (isAvailable && pubkey) {
      console.log("Nostr is available with pubkey:", pubkey);
    }
  }, [isAvailable, pubkey]);

  useEffect(() => {
    if (!pubkey) {
      return;
    }

    const getUserRelays = async () => {
      const userRelays = await getUserRelayList(pubkey);

      const userReadRelays = userRelays.filter((relay) => relay.read);
      const userWriteRelays = userRelays.filter((relay) => relay.write);

      setUserReadRelays(userReadRelays);
      setUserWriteRelays(userWriteRelays);
    };

    getUserRelays();
  }, [pubkey]);

  const handleSendMessage = (message: string) => {
    if (!selectedChannel) {
      console.warn("No channel selected");

      return;
    }

    // Here you would implement the actual message sending logic
    // using nostr-tools to create and sign the event for the specific channel
    console.log(
      "Sending message to channel:",
      selectedChannel.channel.name,
      "Message:",
      message,
    );

    // TODO: Implement actual message sending using nostr-tools
    // Example: Create kind 42 event with channel reference
  };

  if (!isAvailable) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-4">
          <h2 className="text-xl font-bold mb-2">Nostr Extension Required</h2>
          <p>
            Please install a Nostr signer extension (like nos2x or Alby) to
            continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {pubkey && (
        <Toolbar
          pubkey={pubkey}
          userReadRelays={userReadRelays.map((relay) => relay.url)}
          userWriteRelays={userWriteRelays.map((relay) => relay.url)}
          openedChannels={openedChannels}
          onAddOpened={(channel: ChannelMetadata) => {
            // Add to opened list if not already there
            if (!openedChannels.find((c) => c.id === channel.id)) {
              setOpenedChannels((prev) => [channel, ...prev.slice(0, 9)]); // Keep max 10 recent
            }
          }}
        />
      )}
      <div className="flex flex-1">
        {pubkey && userReadRelays.length > 0 && (
          <OpenedChannels
            pubkey={pubkey}
            userReadRelays={userReadRelays.map((relay) => relay.url)}
            userWriteRelays={userWriteRelays.map((relay) => relay.url)}
            selectedChannelId={selectedChannel?.channel.id || null}
            onChannelSelect={setSelectedChannel}
            openedChannels={openedChannels}
            setOpenedChannels={setOpenedChannels}
          />
        )}
        <ChatRoom
          messages={messages}
          onSendMessage={handleSendMessage}
          selectedChannel={selectedChannel}
        />
      </div>
    </div>
  );
}
