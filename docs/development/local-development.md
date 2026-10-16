# Local development

Status: **Implemented** for the first slice (sign-in, dashboard, repository roles, scan queue, encrypted LLM key). A live GitHub install needs an App you create. See [GitHub](../integrations/github.md).

## Requirements

- Node.js 22.18 or newer. `.nvmrc` is `24`.
- pnpm 12.11.2 (`packageManager` in the root `package.json`).
- No Docker. The Worker and D1 run under Wrangler.

## First run

From the repository root:

```powershell
pnpm install
pnpm setup
pnpm db:migrate:local
pnpm dev
```

`pnpm setup` writes `apps/worker/.dev.vars` with a fresh `ENCRYPTION_KEY` when that file is missing. It is gitignored. Do not commit it.

`pnpm dev` starts two processes:

| Process                        | URL                   | Role                                                                 |
| ------------------------------ | --------------------- | -------------------------------------------------------------------- |
| Vite (`@exokortex/web`)        | http://127.0.0.1:5173 | Dashboard with live reload. Proxies `/api` to the Worker.            |
| Wrangler (`@exokortex/worker`) | http://127.0.0.1:8787 | Same dashboard from the latest web build, plus API, D1, queue, cron. |

The Worker build runs before Wrangler starts, so http://127.0.0.1:8787 serves the dashboard instead of a placeholder. Sign in again on that origin. A session on port 5173 is not shared with port 8787.

Open either URL and sign in with any email. Dev login is refused unless `ENVIRONMENT=development` and `AUTH_MODE=dev`.

`APP_BASE_URL` in `.dev.vars` should stay `http://127.0.0.1:5173` so the GitHub install callback returns to the Vite app.

## What you can exercise

1. Sign in. The dashboard counts repositories, projects, and approvals. Those last two stay at zero until later phases.
2. Settings. Change timezone and scan frequency (weekly, biweekly, monthly).
3. AI. Save an OpenAI-compatible base URL, model, and key, then choose Test LLM. The key is not returned by the API.
4. Connections. Connect GitHub fails with “GitHub App is not configured” until the App secrets in [github.md](../integrations/github.md) are filled in.
5. After a real install: repositories appear, you can mark one Portfolio and others Excluded, and Scan now queues a job. The first scan stores SHAs and does not create change events. Activity shows a change only after a later scan sees a different SHA.

## Local data

D1 lives under `apps/worker/.wrangler/` (gitignored). Inspect it with:

```powershell
pnpm --filter @exokortex/worker exec wrangler d1 execute exokortex --local --command "SELECT email FROM users"
```

Migrations are `packages/database/migrations/*.sql`. Apply them again with `pnpm db:migrate:local`. Wrangler skips files that are already recorded in `d1_migrations`.

## Checks

```powershell
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm build` typechecks, builds the Vite app, and dry-runs the Worker bundle. It does not deploy.
