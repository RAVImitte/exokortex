# Contributing

ExoKortex is early. The first slice is scanning. Do not add agent execution, billing, or a second database behind a feature that the roadmap still marks planned.

## Setup

Follow [docs/development/local-development.md](docs/development/local-development.md).

```powershell
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm lint` is ESLint and Prettier. `pnpm format` writes Prettier fixes.

## Boundaries

- Packages stay free of Hono. The Worker composes them.
- New SQL goes in `packages/database/migrations/` as the next number, and in a repository method that takes `userId`.
- Do not log or return API keys, tokens, or ciphertext.
- Mark docs **Implemented**, **Partially implemented**, **Planned**, or **Not implemented**. Do not describe a provider that only throws as if it synced data.
- Do not commit `.dev.vars`, `.env`, or PEM files.

Decisions that are hard to reverse get an ADR in `docs/decisions/`.
