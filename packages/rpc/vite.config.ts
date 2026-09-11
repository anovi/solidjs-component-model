import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

const librarySource = fileURLToPath(
  new URL("../solid-component-model/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "solid-component-model": librarySource,
    },
  },

  build: {
    sourcemap: true,
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },

  test: {
    include: ["src/**/*.test.ts"],
  },
});
