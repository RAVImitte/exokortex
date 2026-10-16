# ExoKortex

ExoKortex watches your project repositories and keeps one portfolio repository up to date, using your own LLM key.

Slices through the Portfolio Engineer are done. The current slice is email when an approval is waiting or a pull request opens.

## Status

Progress lives in the [slice tracker](docs/product/roadmap.md). S0 through S5 are done. S6 Email is current.

## Run it

Node.js 22.18 or newer and pnpm 12.

```powershell
pnpm install
pnpm setup
pnpm db:migrate:local
pnpm dev
```

Open http://localhost:5173 and sign in with any email. Details are in [docs/development/local-development.md](docs/development/local-development.md).

```powershell
pnpm test
pnpm typecheck
pnpm lint
```

## Read next

- [Tech stack](docs/architecture/tech-stack.md)
- [Product vision](docs/product/vision.md)
- [Slice tracker](docs/product/roadmap.md)
- [GitHub App setup](docs/integrations/github.md)
- [Founding brief](docs/product/bootstrap-brief.md)
- [Decisions](docs/decisions/README.md)

License: MIT.
