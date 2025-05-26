import { useState } from "preact/hooks";

import type { Message } from "../types/chat";

interface ChatRoomProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export const ChatRoom = ({ messages, onSendMessage }: ChatRoomProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [currentEmotion, _setCurrentEmotion] = useState<string>("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      return;
    }

    onSendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            <div className="flex items-start">
              <div className="flex-1">
                <div className="font-bold">{message.pubkey.slice(0, 8)}...</div>
                <div className="mt-1">{message.content}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        {currentEmotion && (
          <div className="mb-2 text-sm text-gray-600">
            Current emotion: {currentEmotion}
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.currentTarget.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
