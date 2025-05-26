import { useState, useEffect } from "preact/hooks";

import { ChatRoom } from "../components/ChatRoom";
import { Toolbar } from "../components/Toolbar";
import { useNostr } from "../hooks/useNostr";
import type { UpdatedChannelMetadata } from "../services/channelService";
import {
  channelService,
  type ChannelMetadata,
} from "../services/channelService";
import { NostrService } from "../services/nostrService";
import type { UserRelay } from "../services/types";
import type { Message, Character } from "../types/chat";

export function ChatInterface() {
  const { pubkey, isAvailable } = useNostr();
  const [messages, _setMessages] = useState<Message[]>([]);
  const [_selectedCharacter, _setSelectedCharacter] =
    useState<Character | null>(null);
  const [channelList, setChannelList] = useState<
    Map<string, ChannelMetadata | UpdatedChannelMetadata>
  >(new Map());
  const [userPublicJoinedChannelIds, setUserPublicJoinedChannelIds] = useState<
    string[]
  >([]);
  const [_userWriteRelays, setUserWriteRelays] = useState<UserRelay[]>([]);
  const [userReadRelays, setUserReadRelays] = useState<UserRelay[]>([]);

  const nostrService = new NostrService();

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
      const userRelays = await nostrService.getUserRelayList(pubkey);

      const userReadRelays = userRelays.filter((relay) => relay.read);
      const userWriteRelays = userRelays.filter((relay) => relay.write);

      setUserReadRelays(userReadRelays);
      setUserWriteRelays(userWriteRelays);
    };

    getUserRelays();
  }, [pubkey]);

  useEffect(() => {
    if (!userReadRelays.length) {
      return;
    }

    if (!pubkey) {
      return;
    }

    channelService.subscribeToChannels({
      pubkey,
      setUserPublicJoinedChannelIds,
      relays: userReadRelays.map((relay) => relay.url),
      setChannelList,
      updateChannel: (id, channel) => {
        const ch = channelList.get(id);

        if (!ch) {
          return;
        }

        channelList.set(id, {
          ...channel,
          ...ch,
        });
      },
    });
  }, [userReadRelays]);

  const handleSendMessage = (message: string) => {
    // Here you would implement the actual message sending logic
    // using nostr-tools to create and sign the event
    console.log("Sending message:", message);
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
      <Toolbar
        channelList={channelList}
        userPublicJoinedChannelIds={userPublicJoinedChannelIds}
      />
      <ChatRoom messages={messages} onSendMessage={handleSendMessage} />
    </div>
  );
}
