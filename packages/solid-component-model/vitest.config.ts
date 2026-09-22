/// <reference types="vitest/config" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    conditions: ["browser", "development"],
  },
  test: {
    globals: true,
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],

    coverage: {
      exclude: [
        "test/**/*",
        "**/test/**",
        "src/**/*.test.{ts,tsx,js,js}",
        "src/**/*.spec.{ts,tsx,js,mjs}",
        "src/**/*.d.ts",
      ],
    },

    benchmark: {
      include: ["test/**/*.bench.ts"],
    },
  },
});
