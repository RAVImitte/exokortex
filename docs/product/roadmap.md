# Roadmap

Status words: **Implemented**, **Partially implemented**, **Planned**, **Not implemented**.

## Phase 0 — Infrastructure

**Implemented.** pnpm workspace, Worker, D1 migrations, queue, hourly cron, dev login, dashboard shell.

## Phase 1 — GitHub scanning

**Implemented** in code and fixture tests. **Partially implemented** against a real GitHub App: you create the App and fill `.dev.vars` before install, discovery, and webhooks run live. The first scan stores SHAs and does not emit change events. A later differing SHA emits one event. Portfolio and excluded repositories never emit events.

## Phase 2 — LLM abstraction

**Partially implemented.** An OpenAI-compatible client, encrypted `llm_configs`, and a test call that expects the word `pong` are in place. Agents do not call the client yet.

## Phase 3 — Scout and Analyst

**Implemented** for an open change event. Scout classifies the diff. Noise is stored and skipped. Analyst explains the repository from the README and manifests. Both replies are validated JSON. Curator does not run. A scan with no new SHA still completes without calling a model. An open change with no saved LLM key fails the job until a key is saved.

## Phase 4 — Curator and approval

**Planned.** Workflow states include `CURATING` and `PENDING_APPROVAL`. The Projects and Approvals screens say so. A new project is never auto-approved.

## Phase 5 — Portfolio Engineer

**Planned.** The Engineer will open a pull request. You merge. Auto-merge is a later option, not the default.

## Phase 6 — Reliability

**Partially implemented.** Job claim, backoff, a 15-minute lock timeout, and cron reconciliation exist for scans. Email notifications do not.

## Phase 7 — Hugging Face, Kaggle, Google

**Not implemented.** The provider interface exists. Each provider throws if called.

## Phase 8 — Public beta

**Planned.** Clerk auth is coded and unused until `AUTH_MODE=clerk`. Production deploy steps are documented and not run.

## Phase 9 — Further integrations

**Planned.** No additional providers beyond the three named above.
