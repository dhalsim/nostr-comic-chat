# Nostr Comic Chat - Client

This is the Nostr client for Comic Chat. It allows users to chat using comic-style characters and emotions.

## Features

- Character selection
- Real-time chat using Nostr protocol
- Emotion detection and display
- Background customization
- Blossom server integration for asset loading

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3001 in your browser

## Development

The project uses:
- Preact
- Nostr-tools for Nostr protocol integration
- Tailwind CSS for styling
- Vite for build tooling

## Project Structure

- `src/components/ChatRoom.tsx` - Main chat room component
- `src/components/CharacterSelector.tsx` - Character selection component
- `src/components/MessageList.tsx` - Message display component

## Nostr Integration

The client uses the following Nostr event kinds:
- Kind 1: Regular chat messages
- Kind 10000: Character selection events
- Kind 30563: Character asset definitions 