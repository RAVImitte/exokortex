# Testing

Status: **Partially implemented**. Unit tests cover the deterministic core. A live GitHub App and a live LLM are not required in CI.

## Unit tests

```powershell
pnpm test
```

Vitest runs `packages/**/*.test.ts` and `apps/worker/test/**/*.test.ts` in Node:

| Area                      | What it locks                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@exokortex/core`         | Baseline versus change, portfolio exclusion by role, id, and URL, workflow transitions, scan frequency.                                                                                                           |
| `@exokortex/security`     | AES-GCM round trip and HMAC verification.                                                                                                                                                                         |
| `@exokortex/jobs`         | Backoff, retry limits, idempotency keys.                                                                                                                                                                          |
| `@exokortex/github`       | App JWT shape, discovery, latest revision, and a mocked pull-request write that never calls merge.                                                                                                                |
| `@exokortex/orchestrator` | First scan baselines, portfolio repos are skipped, one change event per new SHA, a repeat is unchanged, a duplicate insert does not count as a second change, portfolio profile discovery, and the engineer edit. |
| `@exokortex/llm`          | A fixture completion that contains `pong` passes the test call.                                                                                                                                                   |
| `@exokortex/agents`       | Invalid Curator JSON is rejected; one retry path parses valid JSON.                                                                                                                                               |
| `@exokortex/shared`       | Secret-like fields are redacted in logs.                                                                                                                                                                          |

## Local D1

`pnpm db:migrate:local` applies `packages/database/migrations` to the Wrangler D1 database. The repository classes are the only writers. Every query is scoped by `user_id`.

Worker tests call the Hono HTTP application and job handlers with mocked external services. A small D1 transport adapter executes real migrations, SQL, constraints, and batch rollback in Node's SQLite. Coverage includes GitHub installation authorization, preserved LLM keys, multi-account scans and discovery, connection isolation, queue recovery, Curator recovery, and project limits. These tests require no live credentials or network calls.

Automated tests do not yet boot the Cloudflare Worker isolate. Run the dashboard checks in [local-development.md](local-development.md) and staging checks for runtime-specific behavior.

## Not in this slice

Agent fixture packs (new project, README-only change, fork, ambiguous project) are **Planned**. Do not add tests that call a live model.
