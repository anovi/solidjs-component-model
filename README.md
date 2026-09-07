# Library monorepo

This is a pnpm workspace for a TypeScript library and its companion packages.

## Requirements

- Node.js 22.22 or newer
- pnpm 10.15.0 (managed through the `packageManager` field)

## Packages

- `solid-component-model` is the unpublished core library.
- `solid-component-model-devtools` consumes `solid-component-model` through the workspace protocol.

`workspace:*` links the packages locally, so the devtools package can import the core package before it has ever been published. The Vite alias in devtools points at the core source during local tests. During a root build, pnpm builds the core package before devtools, so devtools' declaration build resolves the core package through its published package boundary.

## Commands

```sh
pnpm install

pnpm format          # format supported files in the workspace
pnpm lint            # lint the workspace
pnpm typecheck       # type-check every package
pnpm test            # run every package's tests once
pnpm test:coverage   # run every package's tests with coverage
pnpm build           # clean and build every package
pnpm clean           # remove every package's generated dist directory

pnpm --filter solid-component-model build
pnpm --filter solid-component-model-devtools test
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

Each package emits its public declaration entry point at `dist/index.d.ts`.
The devtools build emits only its own declarations at `dist/index.d.ts`. Those
declarations retain an import from `solid-component-model`, so consumers resolve core
types from the core package rather than receiving a copied declaration tree.
