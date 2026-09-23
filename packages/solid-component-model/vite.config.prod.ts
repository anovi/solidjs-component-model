import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    solidPlugin(),

    dts({
      tsconfigPath: "tsconfig.build.json",
      entryRoot: "..",
      insertTypesEntry: true,
      compilerOptions: {
        declaration: true,
        declarationMap: false,
      },
    }),
  ],

  resolve: {
    conditions: ["browser", "production"],
  },

  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
    emptyOutDir: true,

    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },

    rollupOptions: {
      external: id => /^(solid-js|rxjs)(\/.*)?$/.test(id),
    },
  },

  test: {
    globals: true,

    include: [
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],

    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],

    benchmark: {
      include: ["test/**/*.bench.ts"],
    },

    coverage: {
      include: ["src/**/*.{ts,tsx}"],

      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.d.ts",
        "test/**",
        "**/dist/**",
        "**/build/**",
      ],
    },
  },
});
