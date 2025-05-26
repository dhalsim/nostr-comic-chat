export type Server = string & { readonly __brand: unique symbol };
export type RelayUrl = string & { readonly __brand: unique symbol };

export const asServer = (url: string): Server => url as Server;
export const asRelayUrl = (url: string): RelayUrl => url as RelayUrl;

export type UserRelay = {
  url: RelayUrl;
  read: boolean;
  write: boolean;
};

export type ServerOption = [Server, boolean];

export type BlossomX = {
  sha256: string;
  path: string;
  size: number;
  mime: string;
};

export type Emotion = {
  name: string; // e.g. "emotion-a"
  keywords: string[]; // e.g. [":)", "😃", "ahah"]
};

export type BlossomDrive = {
  id: string;
  name: string;
  description: string;
  servers: Server[];
  d: string;
  folders: string[];
  x: BlossomX[];
  emotions: Emotion[];
};
