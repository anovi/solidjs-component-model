/// <reference types="vitest/config" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "solid-component-model": fileURLToPath(
        new URL("../solid-component-model/src/index.ts", import.meta.url)
      ),
    },
    conditions: ["browser", "development"],
  },
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
});
