import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Configure Vitest (https://vitest.dev/config/)
import solidPlugin from "vite-plugin-solid";

const rpcSource = fileURLToPath(
  new URL("../rpc/src/index.ts", import.meta.url)
);

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    conditions: ["browser", "development"],
    alias: {
      "@solid-component-model/rpc": rpcSource,
    },
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
