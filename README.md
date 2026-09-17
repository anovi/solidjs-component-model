# Library monorepo

This is a pnpm workspace for a TypeScript library and its companion packages.

## Requirements

- Node.js 22.22 or newer
- pnpm 10.15.0 (managed through the `packageManager` field)

## Packages

- `solid-component-model` is the publishable core library.
- `@solid-component-model/devtools` is the publishable devtools package.
- `@solid-component-model/rpc` is a private, source-only protocol package.

`workspace:*` links the packages locally. RPC exports TypeScript source, and Vite
aliases resolve the core library to source in devtools. Builds and development
consume current sources without requiring sibling `dist/` directories. RPC edits
are picked up by Vite's development server and build watcher.

## Commands

```sh
pnpm install

pnpm format          # format supported files in the workspace
pnpm lint            # lint the workspace
pnpm typecheck       # type-check every package
pnpm test            # run every package's tests once
pnpm test:coverage   # run every package's tests with coverage
pnpm build           # clean and build every package
pnpm clean           # remove all generated package build directories

pnpm --filter solid-component-model build
pnpm --filter @solid-component-model/devtools test
```

Each package cleans its own `dist/` directory before building, so direct package builds and root builds behave the same way.

## Code quality and hooks

All development tooling lives at the workspace root, including TypeScript, Vite,
Vitest, Prettier, ESLint, Husky, and lint-staged. Package manifests contain only
runtime and workspace dependencies.

`pnpm install` runs the `prepare` script, which enables the Husky pre-commit
hook. The hook runs lint-staged and formats staged TypeScript, JSON, and Markdown
files with Prettier.

## Tests

Keep unit tests beside the module they cover, such as `src/greet.test.ts`. Put
package-level or integration-style tests in `test/`, such as
`test/public-api.test.ts`. Both locations are included in the core library's
test and type-check commands.

## Types

Both public packages use `unplugin-dts` in their Vite configs to emit declarations
and generate `dist/index.d.ts` as the public entry. Private RPC declarations are
included in each package's `dist/rpc/src` directory, and aliases are rewritten
to local declaration paths. Published packages do not
depend on the private package. Devtools declarations keep imports from the public
`solid-component-model` package. RPC exports source and needs no declaration build.
Package builds type-check workspace sources before bundling.

The default devtools build produces the npm library in `dist/`. Its extension
build writes to `dist-extension/`, including the browser extension manifest.
Each build clears only its own output directory. Root `pnpm build` builds the
library; use the devtools `build:all` command to produce both outputs.
Applications using its panel UI can import
`@solid-component-model/devtools/style.css` for the extracted styles.

The existing devtools Vite config selects settings by mode:

```sh
pnpm --filter @solid-component-model/devtools build:library
pnpm --filter @solid-component-model/devtools build:extension
pnpm --filter @solid-component-model/devtools build:all
pnpm --filter @solid-component-model/devtools dev:library
pnpm --filter @solid-component-model/devtools dev          # extension watcher
pnpm --filter @solid-component-model/devtools dev:webapp  # demo server
```
