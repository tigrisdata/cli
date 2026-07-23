# @tigrisdata/cli

Command line interface for Tigris object storage.

> [!NOTE]
> **This repository is a pointer, not the source.**
> `@tigrisdata/cli` is developed in the Tigris monorepo, included here as a git
> submodule at [`storage/`](storage). The CLI package lives at
> [`storage/packages/cli`](storage/packages/cli).
>
> **All development, issues, releases, and version bumps happen in
> [tigrisdata/storage](https://github.com/tigrisdata/storage).** This repository
> only tracks a pinned storage commit and is advanced append-only when a new CLI
> version is released.

## Install

```bash
npm install -g @tigrisdata/cli
# or
brew install tigrisdata/tap/tigris
```

## Build from source

The CLI is built from within the monorepo submodule, where its workspace
dependencies resolve natively:

```bash
git clone --recurse-submodules https://github.com/tigrisdata/cli.git
cd cli/storage
pnpm install
pnpm --filter @tigrisdata/cli build
```

Already cloned without `--recurse-submodules`? Fetch the submodule with:

```bash
git submodule update --init
```

## Contributing

Open issues and pull requests in
[tigrisdata/storage](https://github.com/tigrisdata/storage). Changes are not made
in this repository.

## License

MIT
