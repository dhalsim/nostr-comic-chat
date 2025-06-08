import type { JSX } from "preact";
import { useState, useEffect } from "preact/hooks";

import { createChannel, updateChannel } from "@services/channelService";
import type { ChannelMetadata } from "@services/channelService";
import type { RelayUrl } from "@services/types";
import { asRelayUrl } from "@services/types";

interface CreateUpdateChannelModalProps {
  userWriteRelays: RelayUrl[];
  pubkey: string;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
  channelToUpdate?: ChannelMetadata; // Optional - if provided, we're in update mode
}

export const CreateUpdateChannelModal = ({
  userWriteRelays,
  pubkey,
  onClose,
  onChannelCreated,
  channelToUpdate,
}: CreateUpdateChannelModalProps) => {
  const isUpdateMode = !!channelToUpdate;

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [picture, setPicture] = useState("");
  const [relaysText, setRelaysText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form with existing channel data when in update mode
  useEffect(() => {
    if (channelToUpdate) {
      setName(channelToUpdate.name);
      setAbout(channelToUpdate.about);
      setPicture(channelToUpdate.picture);
      setRelaysText(channelToUpdate.relays.join("\n"));
    }
  }, [channelToUpdate]);

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Channel name is required");

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse relays from text input (one per line)
      const relays = relaysText
        .split("\n")
        .map((relay) => relay.trim())
        .filter((relay) => relay.length > 0)
        .map((relay) => asRelayUrl(relay));

      let channelId: string;

      if (isUpdateMode && channelToUpdate) {
        channelId = await updateChannel({
          userWriteRelays,
          pubkey,
          channelId: channelToUpdate.id,
          name: name.trim(),
          about: about.trim(),
          picture: picture.trim(),
          relays,
        });
      } else {
        channelId = await createChannel({
          userWriteRelays,
          pubkey,
          name: name.trim(),
          about: about.trim(),
          picture: picture.trim(),
          relays,
        });
      }

      onChannelCreated(channelId);
      onClose();
    } catch (err) {
      console.error(
        `Failed to ${isUpdateMode ? "update" : "create"} channel:`,
        err,
      );
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isUpdateMode ? "update" : "create"} channel`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isUpdateMode ? "Update Channel" : "Create Channel"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                setName(e.currentTarget.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter channel name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              About
            </label>
            <textarea
              value={about}
              onChange={(e: JSX.TargetedEvent<HTMLTextAreaElement>) =>
                setAbout(e.currentTarget.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe your channel"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Picture URL
            </label>
            <input
              type="url"
              value={picture}
              onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                setPicture(e.currentTarget.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relays (one per line)
            </label>
            <textarea
              value={relaysText}
              onChange={(e: JSX.TargetedEvent<HTMLTextAreaElement>) =>
                setRelaysText(e.currentTarget.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="wss://relay.example.com&#10;wss://another-relay.com"
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting && (
                <svg
                  className="animate-spin h-4 w-4 mr-2"
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
              )}
              {isSubmitting
                ? isUpdateMode
                  ? "Updating..."
                  : "Creating..."
                : isUpdateMode
                  ? "Update Channel"
                  : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
