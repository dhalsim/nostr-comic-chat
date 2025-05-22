import { useEffect, useState } from "preact/hooks";

import { nostrService, type BlossomDrive } from "../services/nostrService";

interface DriveSelectorProps {
  value: BlossomDrive | null;
  onChange: (drive: BlossomDrive | null) => void;
}

export const DriveSelector = ({ value, onChange }: DriveSelectorProps) => {
  const [drives, setDrives] = useState<BlossomDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDrives = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const pubkey = await nostrService.getPubkeyHex();

        if (!pubkey) {
          setError("Please connect your Nostr extension to view drives");

          return;
        }

        const userRelayList = await nostrService.getUserRelayList(pubkey);

        const userWriteRelays = userRelayList
          .filter((relay) => relay.write)
          .map((relay) => relay.url);

        const drives = await nostrService.getBlossomDrives(userWriteRelays);

        setDrives(drives);
      } catch (err) {
        setError("Failed to load drives");

        console.error("Failed to load drives:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDrives();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-600">Loading drives...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600 mb-2">{error}</div>
        <a
          href="https://blossom.hzrd149.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          Manage Drives
        </a>
      </div>
    );
  }

  if (drives.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-600 mb-2">No drives found</div>
        <a
          href="https://blossom.hzrd149.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          Manage Drives
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={value?.id || ""}
        onChange={(e) =>
          onChange(
            drives.find(
              (drive) => drive.id === (e.target as HTMLSelectElement).value,
            ) || null,
          )
        }
        className="w-full px-3 py-2 border rounded text-sm"
      >
        <option value="">Select a drive</option>
        {drives.map((drive) => (
          <option key={drive.id} value={drive.id}>
            {drive.name || drive.id}
          </option>
        ))}
      </select>
      <div className="text-xs text-gray-600">
        <a
          href="https://blossom.hzrd149.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Manage Drives
        </a>
      </div>
    </div>
  );
};
