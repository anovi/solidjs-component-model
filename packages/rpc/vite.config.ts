import { defineConfig } from "vitest/config";

export default defineConfig({
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
