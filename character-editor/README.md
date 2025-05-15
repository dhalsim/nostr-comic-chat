# Nostr Comic Chat - Character Editor

This is the Character Editor tool for Nostr Comic Chat. It allows you to create and manage character assets for the chat application.

## Features

- Drawing canvas for creating character emotions
- SVG paste support
- Emotion management with keywords
- Character configuration
- Blossom server integration for asset storage

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
- React
- Konva for canvas drawing
- Tailwind CSS for styling
- Vite for build tooling

## Project Structure

- `src/components/CharacterEditor.tsx` - Main editor component
- `src/components/Canvas.tsx` - Drawing canvas component
- `src/components/EmotionManager.tsx` - Emotion management component 
