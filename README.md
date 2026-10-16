# ExoKortex

ExoKortex watches your project repositories and keeps one portfolio repository up to date, using your own LLM key.

Slices through the public beta are done. Publishing is the checklist in [docs/development/deployment.md](docs/development/deployment.md).

## Status

Progress lives in the [slice tracker](docs/product/roadmap.md). S0 through S10 are done. Publishing follows the deployment checklist.

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
- [Hugging Face token](docs/integrations/huggingface.md)
- [Kaggle token](docs/integrations/kaggle.md)
- [Google OAuth](docs/integrations/google.md)
- [Founding brief](docs/product/bootstrap-brief.md)
- [Decisions](docs/decisions/README.md)

License: MIT.
