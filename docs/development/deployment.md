# Deployment

Status: **Deployed**. The public site is [https://exokortex.exokortex.workers.dev/](https://exokortex.exokortex.workers.dev/). Bootstrap scripts still do not deploy. Publish with the Wrangler command below.

## What the deploy uses

One Cloudflare Worker named `exokortex`:

- Static assets from `apps/web/dist` (`not_found_handling: single-page-application`, `run_worker_first: /api/*`).
- D1 database `exokortex`.
- Queue `exokortex-jobs`.
- Cron `15 * * * *`.

`pnpm build` on your machine is the local stand-in: typecheck, Vite build, and `wrangler deploy --dry-run`. It does not publish.

## Secrets

Set these as Worker secrets, never as plain vars in `wrangler.jsonc` and never in git:

```text
ENCRYPTION_KEY
DEV_SESSION_SECRET          # only if AUTH_MODE=dev, which production must not use
CLERK_SECRET_KEY            # when AUTH_MODE=clerk
GITHUB_APP_PRIVATE_KEY
GITHUB_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET
GOOGLE_CLIENT_SECRET
RESEND_API_KEY              # omit to skip mail
```

Non-secret configuration (`ENVIRONMENT=production`, `AUTH_MODE=clerk`, `APP_BASE_URL`, `EMAIL_FROM`, `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `CLERK_PUBLISHABLE_KEY`) can be Wrangler vars. The Vite build needs `VITE_AUTH_MODE=clerk` and `VITE_CLERK_PUBLISHABLE_KEY` at build time.

`AUTH_MODE=dev` must not be set when `ENVIRONMENT` is anything other than `development`. The Worker refuses dev login in that case.

## Continuous delivery

`.github/workflows/ci.yml` is the pipeline.

- A push or pull request to `main` or `dev` installs dependencies, then runs lint, typecheck, tests, and `pnpm build`.
- A push to `main` deploys after those checks pass. The deploy job builds the dashboard with Clerk enabled, applies remote D1 migrations, and runs `wrangler deploy` from `apps/worker`.
- A push to `dev` runs the checks and does not deploy. Improvement work belongs on `dev`. Merge `dev` into `main` to publish.

The deploy job reads `CLOUDFLARE_API_TOKEN` from that GitHub repository secret. Create the token in the Cloudflare dashboard, scoped to this account, with Workers Scripts Edit, D1 Edit, and Queues Edit. Worker secrets already stored in Cloudflare stay in place. The workflow does not read or replace them.

The account id is already in `apps/worker/wrangler.jsonc`, so it is not a second secret.

## Deploy by hand

Use this when the GitHub secret is not available:

1. `pnpm --filter @exokortex/web build` with `VITE_AUTH_MODE=clerk` and `VITE_CLERK_PUBLISHABLE_KEY` set to the publishable key in `wrangler.jsonc`.
2. `pnpm --filter @exokortex/worker exec wrangler d1 migrations apply exokortex --remote`
3. `pnpm --filter @exokortex/worker exec wrangler deploy`

On the public site, the GitHub App callback URL is `https://exokortex.exokortex.workers.dev/api/github/callback`. The webhook URL is `https://exokortex.exokortex.workers.dev/api/github/webhook`. The Google OAuth redirect URI is `https://exokortex.exokortex.workers.dev/api/google/callback`. `APP_BASE_URL` is `https://exokortex.exokortex.workers.dev`.

Production deploys of a user’s portfolio stay on that user’s existing CI. ExoKortex opens a pull request later. It does not deploy the portfolio.
