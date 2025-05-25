import { useEffect, useState } from "preact/hooks";

import { nostrService } from "../services/nostrService";
import type { Server, ServerOption, UserRelay } from "../services/types";
import { asServer } from "../services/types";

export const BlossomServerManager = ({
  userRelayList,
  setServers,
  servers,
}: {
  userRelayList: UserRelay[];
  setServers: (servers: ServerOption[]) => void;
  servers: ServerOption[];
}) => {
  const [newServer, setNewServer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, [userRelayList]);

  const loadServers = async () => {
    try {
      setIsLoading(true);

      const serverList = await nostrService.getBlossomServers(userRelayList);

      setServers(serverList);

      setError(null);
    } catch (err) {
      setError("Failed to load Blossom servers");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServer = async () => {
    if (!newServer.trim()) {
      return;
    }

    try {
      const updatedServers: ServerOption[] = [
        ...servers,
        [asServer(newServer.trim()), true],
      ];

      setServers(updatedServers);

      setNewServer("");

      setError(null);
    } catch (err) {
      setError("Failed to add server");
      console.error(err);
    }
  };

  const publishServers = async () => {
    const selectedServers: Server[] = servers
      .filter(([_, selected]) => selected)
      .map(([server]) => server);

    const userWriteRelays = userRelayList
      .filter((relay) => relay.write)
      .map((relay) => relay.url);

    try {
      await nostrService.publishBlossomServers(
        selectedServers,
        userWriteRelays,
      );

      setSuccess("Blossom servers published successfully");

      // Reload servers after publishing
      await loadServers();
    } catch (err) {
      setError("Failed to publish servers");
      console.error(err);
    }
  };

  const handleToggleServer = (server: string) => {
    const updatedServers: ServerOption[] = servers.map(([s, selected]) => {
      if (s === server) {
        return [s, !selected];
      }

      return [s, selected];
    });

    setServers(updatedServers);
  };

  if (isLoading) {
    return <div>Loading Blossom servers...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🌸 Blossom Servers</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newServer}
            onChange={(e: Event) =>
              setNewServer((e.target as HTMLInputElement).value)
            }
            placeholder="Enter server URL"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleAddServer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ⊕
          </button>
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {servers.map(([server, selected]) => (
          <li
            key={server}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => handleToggleServer(server)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>{server}</span>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={publishServers}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Publish Servers
      </button>
    </div>
  );
};
