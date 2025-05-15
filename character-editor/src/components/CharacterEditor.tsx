import React, { useEffect, useRef } from 'react';
import Editor from '../editor/Editor.js';
import '../styles/svgedit.css';

export const CharacterEditor: React.FC = () => {
  const svgEditorRef = useRef<InstanceType<typeof Editor> | null>(null);

  useEffect(() => {
    if (!svgEditorRef.current && document.getElementById('container')) {
      const svgEditor = new Editor(document.getElementById('container')!);
      
      svgEditor.setConfig({
        allowInitialUserOverride: true,
        extensions: [],
        noDefaultExtensions: false,
        userExtensions: [],
        initFill: {
          color: '000000',
          opacity: 1
        },
        initStroke: {
          color: '000000',
          opacity: 1,
          width: 2
        },
        initOpacity: 1,
        dimensions: [640, 480] as [number, number],
        show_outside_canvas: true,
        selectNew: true,
      });
      
      svgEditorRef.current = svgEditor;
      
      svgEditor.init().then(() => {
        // Listen for SVG content changes
        svgEditor.svgCanvas.addEventListener('svgContentChange', (svgContent: string) => {
          console.log(svgContent);
        });
      });
    }
      
    

    return () => {
      if (svgEditorRef.current?.svgCanvas) {
        // Clear the editor content
        svgEditorRef.current.svgCanvas.clear();
      }
    };
  }, []);

  return (
    <div>
      <div id="container" style={{width: '80%', height: '100vh'}}></div>
      <div id="scenes" style={{width: '20%', height: '100vh'}}></div>
    </div>
  );
}; 