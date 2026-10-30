# Release readiness

What still has to happen before ExoKortex is published for other people, and what would make the first release better. The slice tracker in [roadmap.md](roadmap.md) is finished. This list is the work after it.

Priority words: **Blocker** means do not publish without it. **Should** means fix it in the first weeks. **Polish** means it can wait.

## Blockers

### Continuous integration

`.github/workflows/checks.yml` runs locked dependency installation, lint, typecheck, tests, and the build on Node 22 for pushes and pull requests.

- Require it on `main` before merging.

### Tests for the Worker itself

Package tests and Worker HTTP/job regression tests run in Node with real SQLite and mocked external services. Nothing yet boots the Cloudflare Worker isolate. `@cloudflare/vitest-pool-workers` is already a dev dependency.

- Route tests: sign-in refusal outside development, tenant scoping on every `GET`, the connections API never returning a token, account deletion.
- Job tests: a scan that baselines, a scan that finds a change, a duplicate queue delivery, and an engineer job with a mocked GitHub.
- Agent fixture packs from [testing.md](../development/testing.md): new project, README-only change, fork, ambiguous project. Use recorded model replies, never a live model.

### A real deploy, end to end

`apps/worker/wrangler.jsonc` contains a database identifier and hosted URL, but configuration alone does not establish that the full flow has been verified in Cloudflare.

- Create a staging Worker, D1 database, and queue. Follow [deployment.md](../development/deployment.md) in order.
- Create a production GitHub App with the production callback and webhook URLs. Keep the local App for development.
- Run the whole loop there with a throwaway portfolio repository: connect, mark portfolio, scan, push a change, approve, see the pull request, merge.
- Confirm the hourly cron fires and releases stuck locks.
- Write down how to roll back a deploy and a migration.

### Abuse protection

Rate limiting and Turnstile are both marked **Planned** in [security.md](../architecture/security.md) and [free-tier-strategy.md](free-tier-strategy.md).

- Rate limit sign-in, Scan now, the LLM test, and the connect endpoints per user and per IP.
- Cap Scan now to something like one run per connection every 10 minutes. A user can otherwise burn their own LLM budget, and the queue, by clicking.
- Add Turnstile to the Clerk sign-in or rely on Clerk bot protection, and say which in the docs.

### Security headers

The Worker sets no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, or framing protection.

- Add them in one middleware for both the API and the static dashboard.
- The CSP has to allow Clerk’s script and frame origins in Clerk mode.

### Google verification and legal pages

Reading Drive files for Colab notebooks is a sensitive Google scope. Google shows an "unverified app" warning and caps users until the OAuth consent screen is verified.

- Publish a privacy policy and terms of service. Google verification needs both, and so do users.
- Say plainly what is stored (encrypted tokens, repository names, revisions, model summaries), what is sent to the user’s model (repository content, never credentials), and how deletion works.
- Submit the consent screen for verification, or ship Google as "beta, by invite" until it passes.

### Observability

There is no error tracking or alerting. A failed job is visible in D1 and nowhere else.

- Turn on Workers Logs and keep structured logs, already redacted by `@exokortex/shared`.
- Alert on failed jobs, queue backlog, and repeated LLM errors for one user.
- Show a failed scan to the user on Home with a plain reason, such as "Your model key was rejected".

## Should

### Product gaps

- **Unused workflow states.** `VALIDATING`, `WAITING_FOR_CI`, and `VERIFYING` exist but nothing enters them. Either remove them or build the CI-watching step.
- **Pull request follow-up.** After the pull request opens, ExoKortex does not notice whether it was merged, closed, or failed CI. The Approvals card should show that.
- **Notification settings.** Mail goes out for every approval and pull request. Add an off switch and a weekly digest option, plus an unsubscribe link in each mail.
- **Key rotation.** Ciphertext carries a version prefix, but there is no tool to re-encrypt rows under a new `ENCRYPTION_KEY`.
- **Backups.** Turn on D1 Time Travel and write down how to restore a single user.

### Dashboard

- Browser-test Clerk mode after the UI rework. `ClerkApp.tsx` is now lazy loaded and was only checked by build and typecheck.
- Accessibility pass: keyboard-only run through every page, screen reader labels on icon buttons, colour contrast of the emerald accent on small text.
- While a dialog or the mobile drawer fades out, its overlay blocks clicks for about 0.2 seconds.
- The main bundle is about 470 KB. Split the larger pages with `React.lazy` if first load feels slow on mobile.
- Approvals polls every 3 seconds while open. Stop polling when nothing is in progress.

### Versioning

- Move the `Unreleased` section of `CHANGELOG.md` into `0.2.0`, bump `package.json`, and tag the commit.
- Mark [deployment.md](../development/deployment.md) as implemented once the first real deploy is done.

## Polish

- A public landing page that explains ExoKortex before sign-in.
- A demo mode with sample repositories, so people can click around without connecting anything.
- An onboarding email the first time someone signs in.
- A status page for the hosted service.
- Friendlier errors when the GitHub App or Google client is not configured on a self-hosted copy.
