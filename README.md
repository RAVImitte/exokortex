# ExoKortex

ExoKortex watches your project repositories and keeps one portfolio repository up to date, using your own LLM key.

This repository is the first vertical slice: sign in, connect GitHub, store repositories and commit SHAs, and record a change only when a later scan sees a new SHA. Scout, Analyst, Curator, and Portfolio Engineer do not run yet.

## Status

| Area                                           | Status                                      |
| ---------------------------------------------- | ------------------------------------------- |
| Local Worker, D1, queue, cron                  | Implemented                                 |
| Dev login and dashboard                        | Implemented                                 |
| GitHub App install, discovery, webhooks, scans | Implemented. A live install needs your App. |
| Bring-your-own LLM key, encrypted at rest      | Implemented. Agents do not call it yet.     |
| Portfolio pull requests, approvals, email      | Planned                                     |
| Hugging Face, Kaggle, Google                   | Not implemented                             |

## Run it

Node.js 22.18 or newer and pnpm 12.

```powershell
pnpm install
pnpm setup
pnpm db:migrate:local
pnpm dev
```

Open http://127.0.0.1:5173 and sign in with any email. Details are in [docs/development/local-development.md](docs/development/local-development.md).

```powershell
pnpm test
pnpm typecheck
pnpm lint
```

## Read next

- [Tech stack](docs/architecture/tech-stack.md)
- [Product vision](docs/product/vision.md)
- [Roadmap](docs/product/roadmap.md)
- [GitHub App setup](docs/integrations/github.md)
- [Founding brief](docs/product/bootstrap-brief.md)
- [Decisions](docs/decisions/README.md)

License: MIT.
