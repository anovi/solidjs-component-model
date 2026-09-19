import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import dts from "unplugin-dts/vite";
import { resolve } from "node:path";

const librarySource = fileURLToPath(
  new URL("../solid-component-model/src/index.ts", import.meta.url)
);
export default defineConfig(({ mode }) => {
  const library = mode === "library";
  return {
    publicDir: library ? false : "public",
    plugins: [
      solidPlugin(),
      library &&
        dts({
          tsconfigPath: "tsconfig.build.json",
          entryRoot: "..",
          aliasesExclude: ["solid-component-model"],
          insertTypesEntry: true,
        }),
    ],

    resolve: {
      conditions: ["browser", "development"],
      alias: library ? undefined : { "solid-component-model": librarySource },
    },

    build: {
      outDir: library ? "dist" : "dist-extension",
      emptyOutDir: true,

      sourcemap: true,

      ...(library
        ? {
            lib: {
              entry: "src/index.ts",
              formats: ["es" as const],
              fileName: () => "index.js",
            },
            rollupOptions: {
              external: (id: string) =>
                id === "solid-component-model" ||
                id === "solid-js" ||
                id.startsWith("solid-js/") ||
                id === "@ark-ui/solid" ||
                id.startsWith("@ark-ui/solid/"),
            },
          }
        : {
            rollupOptions: {
              input: {
                devtools: "src/devtools.ts",
                panel: resolve(import.meta.dirname, "panel.html"),
                "content-isolated": "src/page-isolated-world.ts",
                "content-main": "src/page-main-world.ts",
                background: "src/background.ts",
              },

              output: {
                entryFileNames: "[name].js",
                chunkFileNames: "chunks/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
              },
            },
          }),
    },

    test: {
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
