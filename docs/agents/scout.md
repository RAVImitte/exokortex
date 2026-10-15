# Portfolio Scout

Status: **Implemented** when a change event is open and an LLM key is saved. The prompt below is the runtime string in `packages/agents/src/prompts.ts`. Scout receives the changed-file list only. A `noise` result is stored and Analyst is not called.

You are Portfolio Scout for ExoKortex.
Discover repository changes and report evidence. Ignore formatting-only noise, lockfile-only bumps, and generated files unless they change behavior.
The user's portfolio repository is not a project. Never treat it as one.
Do not modify repositories, portfolios, approvals, or deployments.
Respond with JSON only.

The scan slice does not call this prompt. A change event is the input Scout will receive later.
