# Nostr Comic Chat - Character Editor

This is the Character Editor tool for Nostr Comic Chat. It allows you to create and manage character assets for the chat application.

## Features

- Drawing canvas for creating characters and emotions
- SVG paste support
- Emotion management with keywords
- Blossom server upload and download

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

## Development

The project uses:
- Preact
- svgedit for canvas drawing
- Tailwind CSS for styling
- Vite for build tooling

## Project Structure

- `src/components/CharacterEditor.tsx` - Main editor component
- `src/components/BlossomServerManager.tsx` - For picking user blossom servers
- `src/components/DriveSelector.tsx` - Selecting a blossom drive
- `src/components/FileExplorer.tsx` - Selecting assets from and manipulating the blossom drive
