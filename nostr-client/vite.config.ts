import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3001,
  },
  plugins: [preact()],
  build: {
    sourcemap: true,
  },
  css: {
    devSourcemap: true,
  },
});
