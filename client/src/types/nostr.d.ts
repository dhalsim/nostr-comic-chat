import type { NostrEvent } from "nostr-tools";

export interface Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: Omit<NostrEvent, "id" | "sig">): Promise<NostrEvent>;
}

declare global {
  interface Window {
    nostr?: Nostr;
  }
}

// This is needed to make the file a module
export {};
