import { useState, useEffect } from 'preact/hooks';
import { SimplePool } from 'nostr-tools';

interface Message {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}

interface Character {
  name: string;
  emotions: {
    name: string;
    keywords: string[];
    svgContent: string;
  }[];
  defaultEmotion: string;
}

export const ChatRoom = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('');

  const pool = new SimplePool();
  const relays = ['wss://relay.damus.io'];

  useEffect(() => {
    const sub = pool.subscribe(relays, 
      {
        kinds: [1],
        since: Math.floor(Date.now() / 1000) - 60 * 60, // last hour
      },
     {
       onevent: (event) => {
        setMessages((prev) => [...prev, event]);
      }
    });

    return () => {
      sub.close();
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const emotion = detectEmotion(newMessage);
    if (emotion) {
      setCurrentEmotion(emotion);
    }

    // Here you would implement the actual message sending logic
    // using nostr-tools to create and sign the event
    console.log('Sending message:', newMessage);
    setNewMessage('');
  };

  const detectEmotion = (text: string) => {
    if (!selectedCharacter) return null;

    for (const emotion of selectedCharacter.emotions) {
      if (emotion.keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
        return emotion.name;
      }
    }

    return selectedCharacter.defaultEmotion;
  };

  return (
    <div className="flex flex-col h-screen">
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
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}; 
