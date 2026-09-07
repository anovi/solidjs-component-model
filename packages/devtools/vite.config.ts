import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const librarySource = fileURLToPath(
  new URL("../library/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    // Use source locally so this package works before solid-component-model is published or built.
    alias: {
      "solid-component-model": librarySource,
    },
  },
  build: {
    // Preserve declarations emitted by the preceding TypeScript build step.
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      // Consumers should install the core package; do not bundle it into devtools.
      external: ["solid-component-model"],
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
