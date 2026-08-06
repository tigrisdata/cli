# Agent instructions

This repository has no source code of its own.

## Where the real code is

The CLI's source lives in [tigrisdata/storage](https://github.com/tigrisdata/storage)
(a pnpm monorepo) at `packages/cli`. It's embedded here as a git submodule at
`storage/`.

If `storage/` appears empty, this was cloned without `--recurse-submodules`.
Fetch it with:

```bash
git submodule update --init
```

## If you were asked to change CLI behavior

Make the change in `tigrisdata/storage` — see that repo's own `AGENTS.md`.
Do not add, edit, or remove files in this repository. Pull requests opened
here are closed automatically by `.github/workflows/reject-prs.yml`.

## Building / running locally

```bash
cd storage
pnpm install
pnpm --filter @tigrisdata/cli build
pnpm --filter @tigrisdata/cli test
```
