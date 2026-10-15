# Agent architecture

Status: **Planned**. Prompts and the Curator schema are **Implemented** as text and Zod. Nothing in the scan path calls a model.

Four agents, in order. The orchestrator in `@exokortex/orchestrator` decides when each runs. Agents return JSON. Invalid JSON is retried once and then rejected. Unvalidated output is never acted on.

| Agent              | Job                                                                       | Must not                                                                    |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Portfolio Scout    | Report what changed, with evidence.                                       | Treat the portfolio repository as a project, or modify anything.            |
| Portfolio Analyst  | Explain a repository from README, tree, manifests, history, and the diff. | Decide whether the portfolio should change.                                 |
| Portfolio Curator  | Classify `UNCHANGED`, `UPDATED_PROJECT`, `NEW_PROJECT`, or `IGNORE`.      | Approve a new project. That is a human step. At most 5 follow-up questions. |
| Portfolio Engineer | Apply an already-approved change as a pull request.                       | Force-push, commit secrets, or deploy.                                      |

Prompt text lives in `packages/agents/src/prompts.ts` and is copied in `docs/agents/`. Workflow states that name these agents exist in `@exokortex/core` so the scan path cannot jump ahead into them by accident. The scan slice stops at `COMPLETED` after `SCANNING`.
