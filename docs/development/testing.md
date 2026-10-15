# Testing

Status: **Partially implemented**. Unit tests cover the deterministic core. A live GitHub App and a live LLM are not required in CI.

## Unit tests

```powershell
pnpm test
```

Vitest runs `packages/**/*.test.ts` in Node:

| Area                      | What it locks                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@exokortex/core`         | Baseline versus change, portfolio exclusion by role, id, and URL, workflow transitions, scan frequency.                                                       |
| `@exokortex/security`     | AES-GCM round trip and HMAC verification.                                                                                                                     |
| `@exokortex/jobs`         | Backoff, retry limits, idempotency keys.                                                                                                                      |
| `@exokortex/github`       | App JWT shape and discovery plus latest-revision calls against a mocked `fetch`.                                                                              |
| `@exokortex/orchestrator` | First scan baselines, portfolio repos are skipped, one change event per new SHA, a repeat is unchanged, a duplicate insert does not count as a second change. |
| `@exokortex/llm`          | A fixture completion that contains `pong` passes the test call.                                                                                               |
| `@exokortex/agents`       | Invalid Curator JSON is rejected; one retry path parses valid JSON.                                                                                           |
| `@exokortex/shared`       | Secret-like fields are redacted in logs.                                                                                                                      |

## Local D1

`pnpm db:migrate:local` applies `packages/database/migrations` to the Wrangler D1 database. The repository classes are the only writers. Every query is scoped by `user_id`.

Automated tests do not yet boot the Worker isolate. Run the dashboard checks in [local-development.md](local-development.md) for the HTTP path.

## Not in this slice

Agent fixture packs (new project, README-only change, fork, ambiguous project) and the approval workflow are **Planned**. They arrive with the Curator. Do not add tests that call a live model.
