# Tech stack

ExoKortex is a TypeScript monorepo. One Cloudflare Worker serves the API and, in production, the built dashboard. Durable state lives in D1. A queue only wakes work up. The model never sees GitHub tokens or API keys.

This page explains why each piece is here and what it is responsible for. Versions below are the ranges pinned in `package.json` files.

## How a request moves

```text
Browser (React)
    │  /api/*  (Vite proxies this to the Worker in local dev)
    ▼
Hono on a Cloudflare Worker
    │  session cookie or Clerk
    ▼
Repository classes  →  D1 (SQLite)
    │
    ├─ enqueue a job id only
    ▼
Cloudflare Queue  →  scan handler  →  GitHub App (installation token, not stored)
```

An hourly cron does two things: it releases scans that have been locked too long, and it enqueues the next scan for users whose `next_scan_at` has passed.

## Runtime

| Piece                                                                                   | Role                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/)                        | HTTP API, cron, and queue consumer in one deployable. Compatibility date `2026-10-01`, with `nodejs_compat`.             |
| [D1](https://developers.cloudflare.com/d1/)                                             | The only database. SQLite, one database named `exokortex`.                                                               |
| [Queues](https://developers.cloudflare.com/queues/)                                     | Trigger only. A message is `{ jobId }`. The job row in D1 holds the payload, attempts, and lock.                         |
| [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | `15 * * * *`. Reconciliation and scheduled scans.                                                                        |
| Workers static assets                                                                   | Serves `apps/web/dist`. `/api/*` always hits the Worker first. Other paths fall through to the single-page app.          |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) `^4.151`                | Local dev (`wrangler dev` / Miniflare), local D1 migrations, and dry-run builds. Nothing is deployed from this repo yet. |

D1 is the source of truth. If the queue retries a message, the handler claims the job row with a conditional update. A second delivery finds the row already locked or finished and does nothing.

There is no Redis, Kafka, Kubernetes, Docker Compose, or separate API process. Local development is Wrangler plus the Vite dev server.

## Language and workspace

| Piece                         | Role                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript `~6.0.3`           | Every package. `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Imports use `.js` specifiers because the compiler emits ESM. |
| Node.js `>=22.18`             | Tooling and tests. `.nvmrc` is `24`.                                                                                                      |
| pnpm `12.11.2`                | Workspace in `pnpm-workspace.yaml`: `apps/*` and `packages/*`.                                                                            |
| ESLint 10 + typescript-eslint | Flat config.                                                                                                                              |
| Prettier 3                    | Formatting. Print width 100.                                                                                                              |
| Vitest `^4.1`                 | Unit tests for domain rules, crypto, jobs, GitHub fixtures, scans, and LLM parsing.                                                       |

Packages do not call each other in circles. The Worker is the composition root. Libraries stay free of Hono and of Cloudflare bindings except `@exokortex/database`, which types its queries against `D1Database`.

| Package                       | Owns                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `@exokortex/shared`           | `AppError`, ids, timestamps, log lines, secret redaction.                                      |
| `@exokortex/core`             | Repository roles, workflow transitions, scan limits, revision comparison, portfolio exclusion. |
| `@exokortex/security`         | AES-GCM and HMAC-SHA256 on Web Crypto.                                                         |
| `@exokortex/jobs`             | Idempotency keys, backoff, lock expiry.                                                        |
| `@exokortex/database`         | Numbered SQL migrations and one repository class per table group.                              |
| `@exokortex/source-providers` | The provider interface used by GitHub, Hugging Face, Kaggle, and Google.                       |
| `@exokortex/github`           | GitHub App JWT, installation tokens, repository discovery, commit SHAs, pull requests.         |
| `@exokortex/google`           | OAuth refresh, Colab notebook discovery, and Drive revisions.                                  |
| `@exokortex/huggingface`      | A read token, discovery of the user’s models, datasets, and spaces, and commit diffs.          |
| `@exokortex/kaggle`           | An API token, discovery of the user’s datasets and notebooks, and version diffs.               |
| `@exokortex/orchestrator`     | Scan, Scout, Analyst, Curator, and the Engineer edit.                                          |
| `@exokortex/llm`              | OpenAI-compatible `POST /chat/completions`.                                                    |
| `@exokortex/agents`           | Prompt text and Zod schemas for Scout, Analyst, Curator, and the Engineer.                     |
| `@exokortex/worker`           | HTTP routes, auth, queue consumer, cron.                                                       |
| `@exokortex/web`              | Dashboard.                                                                                     |

## API

[Hono](https://hono.dev/) `^4.13` is the HTTP framework. Routes are split by feature under `apps/worker/src/routes/`:

- `session.ts` — health, local dev login, logout
- `account.ts` — profile, dashboard, settings, account deletion
- `github.ts` — App install, callback, webhooks, connection list
- `google.ts` — OAuth connect, Colab discovery
- `huggingface.ts` — read token, account check, discovery
- `kaggle.ts` — API token, account check, discovery
- `repositories.ts` — repository list, role changes, scan-now, change events
- `llm.ts` — save and test a bring-your-own key
- `approvals.ts` — project list and approve or reject

`app.ts` only registers middleware and those route modules. Public paths (health, dev login, logout, GitHub callback, GitHub webhook, Google callback) skip the session check. Everything else requires a user.

Errors that the app throws on purpose are `AppError` and return `{ error: { code, message } }`. Anything else becomes a generic 500. Logs are JSON lines with secrets redacted.

## Dashboard

| Piece                       | Role                                                           |
| --------------------------- | -------------------------------------------------------------- |
| React `^19`                 | UI. One file per screen in `apps/web/src/pages/`.              |
| React Router `^7`           | Client-side routes.                                            |
| Vite `^8`                   | Dev server on port `5173`. Proxies `/api` to `127.0.0.1:8787`. |
| `@vitejs/plugin-react` `^6` | JSX transform.                                                 |

The production build is static files. The Worker serves them. There is no Next.js server and no second hosting project.

Screens that exist: login, dashboard, repositories, connections, activity, AI settings, account settings, projects, and approvals. Progress lives in the [slice tracker](../product/roadmap.md).

## Authentication

Two verifiers sit behind one `identify()` function in the Worker.

| Mode              | When                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_MODE=dev`   | Local only. Refused unless `ENVIRONMENT=development`. The cookie `exo_session` is `base64url(payload).hmac`. HttpOnly, SameSite=Lax, 14 days.                             |
| `AUTH_MODE=clerk` | [Clerk](https://clerk.com/). The browser sends the session token. `@clerk/backend` verifies it and stores the primary email. Sign-in renders when `VITE_AUTH_MODE=clerk`. |

One user is one tenant. The database key is `users.id`. Clerk’s user id, or `dev:<email>`, is stored as `auth_subject`. There are no teams.

## GitHub

Integration is a [GitHub App](https://docs.github.com/apps), not a personal access token stored for the user.

1. The user installs the App. The callback carries `installation_id` and a short-lived signed `state`.
2. The Worker encrypts `{ installationId }` and stores that ciphertext on the connection row.
3. Each GitHub call mints an App JWT (RS256, Web Crypto), exchanges it for an installation token, and drops the token when the call finishes. Installation tokens are not written to D1.

GitHub calls read repository metadata, the latest commit, and file contents. The Engineer writes one project-data file on a new branch and opens a pull request. Actions are read later. Webhooks (`push`, `installation`, `installation_repositories`) are verified with HMAC-SHA256 (`X-Hub-Signature-256`) before any job is enqueued.

## Data

Schema changes are numbered files in `packages/database/migrations/`, applied with:

```bash
pnpm db:migrate:local
```

That runs `wrangler d1 migrations apply`. There is no ORM. Each repository method takes a `userId` and puts it in the SQL. Foreign keys from `users` use `ON DELETE CASCADE`, so deleting an account removes that user’s rows.

Important uniqueness rules:

- A repository is unique per user, connection, and external id.
- A change event is unique per repository and revision pair, so the same push cannot open two events.
- A job is unique on `idempotency_key`.

The first successful scan of a repository stores its revision and does not emit a change event. A later scan emits one event only when that revision differs. Portfolio and excluded repositories never emit change events.

## Workflow

Scan jobs move a workflow row through a state machine in `@exokortex/core`. Illegal transitions throw. A scan with agent work uses:

`SCAN_PENDING` → `SCANNING` → `SCOUTING` → `ANALYZING` → `CURATING` → `PENDING_APPROVAL` or `COMPLETED`

A scan with nothing to classify stops at `COMPLETED` after `SCANNING`. Approving the last waiting item moves `PENDING_APPROVAL` to `ENGINEERING`. The engineer job then moves that workflow to `COMPLETED`. `VALIDATING`, `WAITING_FOR_CI`, and `VERIFYING` are defined and unused. A failure moves to `FAILED` when that transition is legal. Progress lives in the [slice tracker](../product/roadmap.md).

A failed scan retries with backoff (`30s * 2^(attempt-1)`, capped at 6 hours) up to 3 attempts. A lock older than 15 minutes is released by the cron. Retrying a scan that is already `SCANNING` is not a new transition; the handler keeps going.

Idempotency keys:

| Trigger       | Key                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Push webhook  | `scan:{userId}:{repositoryId}:{revision}`                                                         |
| Scan now      | `scan:{userId}:manual:{minute}` for GitHub, with the provider name inserted for other connections |
| First connect | `scan:{userId}:bootstrap:{installationId}`                                                        |
| Cron          | `scan:{userId}:scheduled:{nextScanAt}` for GitHub, with the provider name inserted otherwise      |
| Engineer      | `engineer:{userId}:{approvalId}`                                                                  |

## Secrets and the model

| Secret                 | Where it lives                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY`       | Worker secret. 32 bytes, base64. `pnpm setup` writes one into `apps/worker/.dev.vars`, which is gitignored.                                                                 |
| GitHub App private key | Worker secret. Newlines may be stored as `\n`.                                                                                                                              |
| GitHub webhook secret  | Worker secret. Used only to verify signatures.                                                                                                                              |
| User LLM API key       | AES-GCM ciphertext in `llm_configs`. The API never returns it. A test call decrypts it inside the Worker, asks the model to reply `pong`, and returns `{ ok, model }` only. |

Ciphertext is `v1:<iv>:<cipher>`, so a future key version can be told apart from the current one.

The LLM client speaks the OpenAI chat-completions shape. Any compatible base URL works. ExoKortex does not pay for inference and does not send credentials to the model. Scout, Analyst, and Curator run from the scan job. The Engineer runs from its own job. All four return validated JSON.

The slice list is finished. Turnstile and deploying the portfolio from the user’s CI stay **Planned**. Publishing ExoKortex is the checklist in [deployment.md](../development/deployment.md). The user merges pull requests. Auto-merge stays off. Email is sent through Resend when an approval is waiting and when a pull request opens. Hugging Face, Kaggle, and Google Colab are sources. The portfolio repository stays on GitHub.

## What this stack deliberately leaves out

Billing, teams, a mobile app, more than one portfolio per user, vector search, event sourcing, and an ORM. Those are product limits, not missing dependencies.

The founding brief is [docs/product/bootstrap-brief.md](../product/bootstrap-brief.md).
