declare module "*/editor/Editor.js" {
  interface SvgCanvas {
    getSvgString(): string;
    getMode(): string;
    setMode(mode: string): void;
    getCurrentDrawing(): any;
    getSelectedElements(): any[];
    clear(): void;
    getElement(element: string): HTMLElement;
    container: HTMLElement;
    undo(): void;
    redo(): void;
    copySelectedElements(): void;
    pasteElements(): void;
    deleteSelectedElements(): void;
    cutSelectedElements(): void;
    convertToPath(
      elem?: Element,
      getBBox?: boolean,
    ): void | DOMRect | false | SVGPathElement | null;
    randomizeIds(enableRandomization?: boolean): void;
    setBlur(elem: Element, val: number): void;
    setBlurNoUndo(elem: Element, val: number): void;
    setBlurOffsets(elem: Element, val: number): void;
    getBlur(elem: Element): string;
    getPaintOpacity(type: "fill" | "stroke"): number;
    setGoodImage(val: string): void;
    // Color and stroke settings
    setFillColor(color: string): void;
    setStrokeColor(color: string): void;
    setStrokeWidth(width: number): void;
    setFillOpacity(opacity: number): void;
    setStrokeOpacity(opacity: number): void;
    setStrokeDashArray(value: string): void;
    // Event handling
    bind(
      eventName: string,
      callback: (window: Window, data: any) => void,
    ): void;
    unbind(eventName: string, callback: (data: any) => void): void;
    // SVG content handling
    addEventListener(eventName: string, callback: (data: any) => void): void;
  }

  const Editor: {
    new (container: HTMLElement): {
      svgCanvas: SvgCanvas;
      setConfig(config: {
        imgPath?: string;
        allowInitialUserOverride: boolean;
        extensions: any[];
        noDefaultExtensions: boolean;
        userExtensions: any[];
        initFill: {
          color: string;
          opacity: number;
        };
        initStroke: {
          color: string;
          opacity: number;
          width: number;
        };
        initOpacity: number;
        dimensions: [number, number];
        show_outside_canvas: boolean;
        selectNew: boolean;
        noStorageOnLoad: boolean;
      }): void;
      shortcuts: {
        key: string;
        fn: () => void;
      }[];
      init(): Promise<void>;
      ready(cb: () => void): Promise<void>;
      loadSvgString(svgString: string): void;
    };
  };
  export default Editor;
}
