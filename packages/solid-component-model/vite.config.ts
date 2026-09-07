import { defineConfig } from "vitest/config";

// Configure Vitest (https://vitest.dev/config/)
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    conditions: ["browser", "development"],
  },
  build: {
    // `tsc --emitDeclarationOnly` runs before Vite and writes declarations here.
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      name: "SolidComponentModel",
      fileName: "index",
    },
    rollupOptions: {
      external: ["solid-js", "solid-js/store", "rxjs"],
    },
  },
  test: {
    globals: true,
    include: [
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],

    benchmark: {
      include: ["test/**/*.bench.ts"],
    },
  },
});
