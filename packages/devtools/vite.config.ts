import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import { resolve } from "node:path";

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

    sourcemap: true,

    rollupOptions: {
      input: {
        devtools: "src/devtools.ts",
        panel: resolve(__dirname, "panel.html"),
        "content-isolated": "src/page-isolated-world.ts",
        "content-main": "src/page-main-world.ts",
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
