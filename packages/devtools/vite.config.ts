import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const librarySource = fileURLToPath(
  new URL("../solid-component-model/src/index.ts", import.meta.url)
);
const rpcSource = fileURLToPath(
  new URL("../rpc/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "solid-component-model/rpc": rpcSource,
      rpc: rpcSource,
      "solid-component-model": librarySource,
    },
  },

  build: {
    emptyOutDir: false,

    rollupOptions: {
      input: {
        devtools: "src/devtools.ts",
        panel: "src/panel",
        "content-isolated": "src/page-isolated-world",
        "content-main": "src/page-main-world",
        background: "src/background.js",
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
