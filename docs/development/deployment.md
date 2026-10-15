# Deployment

Status: **Planned**. This repository runs locally. Do not deploy it from the bootstrap scripts.

## What a later deploy uses

One Cloudflare Worker named `exokortex`:

- Static assets from `apps/web/dist` (`not_found_handling: single-page-application`, `run_worker_first: /api/*`).
- D1 database `exokortex`.
- Queue `exokortex-jobs`.
- Cron `15 * * * *`.

`pnpm build` is the local stand-in: typecheck, Vite build, and `wrangler deploy --dry-run`. It does not publish.

## Secrets

Set these as Worker secrets, never as plain vars in `wrangler.jsonc` and never in git:

```text
ENCRYPTION_KEY
DEV_SESSION_SECRET          # only if AUTH_MODE=dev, which production must not use
CLERK_SECRET_KEY            # when AUTH_MODE=clerk
GITHUB_APP_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
```

Non-secret configuration (`ENVIRONMENT=production`, `AUTH_MODE=clerk`, `APP_BASE_URL`, `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `CLERK_PUBLISHABLE_KEY`) can be Wrangler vars. The Vite build needs `VITE_AUTH_MODE=clerk` and `VITE_CLERK_PUBLISHABLE_KEY` at build time.

`AUTH_MODE=dev` must not be set when `ENVIRONMENT` is anything other than `development`. The Worker refuses dev login in that case.

## Order of operations, when you do deploy

1. Create the D1 database and replace the placeholder `database_id` in `apps/worker/wrangler.jsonc`.
2. Create the queue `exokortex-jobs`.
3. `pnpm --filter @exokortex/web build`
4. `pnpm --filter @exokortex/worker exec wrangler d1 migrations apply exokortex --remote`
5. Put secrets in place.
6. `pnpm --filter @exokortex/worker exec wrangler deploy`

The GitHub App callback URL becomes `https://<your-host>/api/github/callback`. The webhook URL becomes `https://<your-host>/api/github/webhook`.

Production deploys of a user’s portfolio stay on that user’s existing CI. ExoKortex opens a pull request later. It does not deploy the portfolio.
