import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const librarySource = fileURLToPath(
  new URL("../library/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "solid-component-model": librarySource,
    },
  },

  build: {
    emptyOutDir: false,

    rollupOptions: {
      input: {
        devtools: "src/devtools.ts",
        panel: "src/panel",
        content: "src/content",
      },

      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },

      external: ["solid-component-model"],
    },
  },

  test: {
    include: ["src/**/*.test.ts"],
  },
});
