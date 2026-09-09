/// <reference types="vitest/config" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from "vite";

export default defineConfig({
  test: {
    projects: [
      "packages/devtools",
      "packages/rpc",
      "packages/solid-component-model",
    ],
  },
});
