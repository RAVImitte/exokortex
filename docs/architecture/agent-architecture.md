# Agent architecture

Status: Scout, Analyst, and Curator run in the scan job. Portfolio Engineer runs in its own job after approval. Progress lives in the [slice tracker](../product/roadmap.md).

Four agents, in order. The orchestrator in `@exokortex/orchestrator` decides when each runs. Agents return JSON. Invalid JSON is retried once and then rejected. Unvalidated output is never acted on.

| Agent              | Job                                                                       | Must not                                                                    |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Portfolio Scout    | Report what changed, with evidence.                                       | Treat the portfolio repository as a project, or modify anything.            |
| Portfolio Analyst  | Explain a repository from README, tree, manifests, history, and the diff. | Decide whether the portfolio should change.                                 |
| Portfolio Curator  | Classify `UNCHANGED`, `UPDATED_PROJECT`, `NEW_PROJECT`, or `IGNORE`.      | Approve a new project. That is a human step. At most 5 follow-up questions. |
| Portfolio Engineer | Apply an already-approved change as a pull request.                       | Force-push, commit secrets, or deploy.                                      |

Prompt text lives in `packages/agents/src/prompts.ts` and is copied in `docs/agents/`. The scan job moves `SCANNING` through `SCOUTING`, `ANALYZING`, and `CURATING`, then to `PENDING_APPROVAL` or `COMPLETED`. Approving the last waiting item moves the workflow to `ENGINEERING`. The Engineer job then opens a pull request and moves it to `COMPLETED`. `VALIDATING`, `WAITING_FOR_CI`, and `VERIFYING` are unused.
