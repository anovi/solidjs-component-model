import { defineConfig } from "vitest/config";

// Configure Vitest (https://vitest.dev/config/)
import solidPlugin from "vite-plugin-solid";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    solidPlugin(),
    dts({
      tsconfigPath: "tsconfig.build.json",
      entryRoot: "..",
      insertTypesEntry: true,
    }),
  ],
  resolve: {
    conditions: ["browser", "development"],
  },
  build: {
    sourcemap: true,
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
