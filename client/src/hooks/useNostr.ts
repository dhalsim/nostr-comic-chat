import { useEffect, useState } from "preact/hooks";

export const useNostr = () => {
  const [nostr, setNostr] = useState(window.nostr);
  const [pubkey, setPubkey] = useState<string | null>(null);

  useEffect(() => {
    // Check if nostr is already available
    if (window.nostr) {
      setNostr(window.nostr);
    }

    // Set up observer to watch for nostr injection
    const checkNostrInterval = setInterval(() => {
      if (window.nostr && !nostr) {
        setNostr(window.nostr);
      }
    }, 500);

    return () => clearInterval(checkNostrInterval);
  }, [nostr]);

  // Get pubkey when nostr becomes available
  useEffect(() => {
    const getPubkey = async () => {
      if (nostr) {
        try {
          const key = await nostr.getPublicKey();
          setPubkey(key);
        } catch (error) {
          console.error("Failed to get public key:", error);
        }
      }
    };

    getPubkey();
  }, [nostr]);

  return {
    pubkey,
    isAvailable: !!nostr,
  };
};
