# @tigrisdata/cli

Command line interface for Tigris object storage.

> [!NOTE]
> **This repository has no source code of its own.**
> `@tigrisdata/cli` is developed in the Tigris monorepo,
> [tigrisdata/storage](https://github.com/tigrisdata/storage), under
> [`packages/cli`](https://github.com/tigrisdata/storage/tree/main/packages/cli).
> It's embedded here as a git submodule at [`storage/`](storage).

## Install

```bash
npm install -g @tigrisdata/cli
# or
brew install tigrisdata/tap/tigris
```

## Build from source

```bash
git clone --recurse-submodules https://github.com/tigrisdata/cli.git
cd cli/storage
pnpm install
pnpm --filter @tigrisdata/cli build
```

Cloned without `--recurse-submodules`? `storage/` will be empty. Fetch it with:

```bash
git submodule update --init
```

## Contributing

Pull requests opened here are closed automatically. Open issues and pull
requests in [tigrisdata/storage](https://github.com/tigrisdata/storage) instead.

**Agents:** see [AGENTS.md](AGENTS.md) before making any change in this repository.

## License

MIT
