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

| Process                        | URL                   | Role                                     |
| ------------------------------ | --------------------- | ---------------------------------------- |
| Vite (`@exokortex/web`)        | http://localhost:5173 | Dashboard. Proxies `/api` to the Worker. |
| Wrangler (`@exokortex/worker`) | http://127.0.0.1:8787 | API, local D1, queue, and cron.          |

Open http://localhost:5173 and sign in with any email. Port 8787 does not serve a second copy of the dashboard. Dev login is refused unless `ENVIRONMENT=development` and `AUTH_MODE=dev`. Production sign-in is Clerk: set `AUTH_MODE=clerk`, `CLERK_SECRET_KEY`, `VITE_AUTH_MODE=clerk`, and `VITE_CLERK_PUBLISHABLE_KEY`.

`APP_BASE_URL` in `.dev.vars` should stay `http://localhost:5173` so the GitHub install callback returns to the Vite app. Leave `RESEND_API_KEY` empty locally unless you want approval and pull-request mail. `EMAIL_FROM` is the Resend sender, such as `ExoKortex <notifications@your-domain>`.

## What you can exercise

1. Sign in. Home shows a setup checklist until a source is connected, an AI key is saved, a portfolio is marked, and the first scan has run. Below it are counts for repositories, projects, and approvals, plus recent activity. The sidebar badge shows waiting approvals.
2. Settings. Change scan frequency (weekly, every 2 weeks, monthly) and timezone, and pick a theme. The theme also cycles from the button in the sidebar footer. It follows the system setting by default.
3. AI model. Pick a preset (OpenAI, OpenRouter, Groq) or Custom, enter the model and key, then choose Test model. The key is not returned by the API, so enter it again whenever you save.
4. Connections. Each provider has a card. Connect GitHub fails with “GitHub App is not configured” until the App secrets in [github.md](../integrations/github.md) are filled in. Hugging Face takes a read token and Kaggle takes an API token in a form that opens on the card. Connect Google Colab fails until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. See [huggingface.md](../integrations/huggingface.md), [kaggle.md](../integrations/kaggle.md), and [google.md](../integrations/google.md). An empty token is rejected and nothing is stored. Disconnect asks for confirmation.
5. Repositories. After a real install, a Hugging Face token, a Kaggle token, or a Google connection, repositories appear. Filter them by role or search by name. Mark one GitHub repository Portfolio and others Excluded, and Scan now queues a job per connection. The first scan stores revisions and does not create change events. Activity shows a change only after a later scan sees a different revision. Hugging Face, Kaggle, and Google rows cannot be the portfolio.

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
