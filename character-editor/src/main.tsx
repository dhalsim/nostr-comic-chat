import React from 'react';
import { createRoot } from 'react-dom/client';
import { CharacterEditor } from './components/CharacterEditor';
import './index.css';

const root = createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <CharacterEditor />
  </React.StrictMode>
); 