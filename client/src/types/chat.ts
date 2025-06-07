export interface Message {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}

export interface Character {
  name: string;
  emotions: {
    name: string;
    keywords: string[];
    svgContent: string;
  }[];
  defaultEmotion: string;
}
