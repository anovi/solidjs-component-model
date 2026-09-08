import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

const librarySource = fileURLToPath(
  new URL("../solid-component-model/src/index.ts", import.meta.url)
);
const rpcSource = fileURLToPath(
  new URL("../rpc/src/index.ts", import.meta.url)
);

export default defineConfig({
  plugins: [solidPlugin()],

  resolve: {
    conditions: ["browser", "development"],
    alias: {
      "@solid-component-model/rpc": rpcSource,
      "solid-component-model": librarySource,
    },
  },

  build: {
    emptyOutDir: false,

    rollupOptions: {
      input: {
        devtools: "src/devtools.ts",
        panel: "src/panel/panel.ts",
        "content-isolated": "src/page-isolated-world",
        "content-main": "src/page-main-world",
        background: "src/background.ts",
      },

      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },

  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
