import path from "path";

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
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },
  css: {
    devSourcemap: true,
  },
});
