# Slice tracker

This is the only progress list. A slice is done when its acceptance checks pass. Exactly one slice is **current**. Do not start a later slice early. When a slice finishes, update this file in the same change as the code.

Status words: **Done**, **Current**, **Later**.

## S0 — Infrastructure

**Done.**

Entry: an empty repository.

Acceptance:

- pnpm workspace, Worker, D1 migrations, queue, and hourly cron run locally.
- Dev login and the dashboard shell work.

## S1 — GitHub scan

**Done.** A live install still needs your GitHub App and `.dev.vars`. Setup stays in [docs/integrations/github.md](../integrations/github.md).

Entry: S0 is done.

Acceptance:

- Install, discovery, and repository roles persist.
- The first scan stores SHAs and writes no change event.
- A later differing SHA writes one event.
- Portfolio and excluded repositories never emit events.

## S2 — LLM

**Done.**

Entry: S1 is done.

Acceptance:

- The user's key is encrypted at rest.
- An OpenAI-compatible client can call the model.
- A test call expects the word `pong`.

## S3 — Scout and Analyst

**Done.**

Entry: S2 is done.

Acceptance:

- An open change with a saved key runs Scout, then Analyst, and both replies are validated JSON.
- Noise is stored and skipped unless Activity forces analysis.
- A scan with no new SHA and nothing waiting for Curator completes without a model call.

## S4 — Curator and approval

**Done.** Approving writes a project row. It does not open a pull request. That is why S5 is separate.

Entry: S3 is done.

Acceptance:

- After Analyst, Curator classifies the repository against the portfolio project list.
- Curator may ask Analyst up to 5 follow-up questions.
- `NEW_PROJECT` and `UPDATED_PROJECT` wait on the Approvals screen.
- Approving a new project creates it. Rejecting records the decision.
- When no approval is still pending, the workflow moves to `COMPLETED`.

## S5 — Portfolio Engineer

**Done.** The Worker isolate is still untested, the same as scan jobs. Orchestrator and GitHub tests use mocks.

Entry: S4 acceptance checks pass.

Acceptance:

- Marking a repository `PORTFOLIO` stores its framework, project-data path, test command, and build command once.
- Approving the last pending item enqueues an `engineer` job and moves the workflow to `ENGINEERING`.
- The job edits that data file on a new branch and opens one pull request. The URL is stored and shown on Approvals.
- A rejection enqueues nothing.
- Nothing merges the pull request or enters `VALIDATING`, `WAITING_FOR_CI`, or `VERIFYING`. After the pull request exists, the workflow is `COMPLETED`.

## S6 — Email

**Current.**

Entry: S5 acceptance checks pass.

Notify when an approval is waiting and when a pull request is opened. Resend is named in the founding brief and is not wired. Write the steps at the start of this slice.

## S7 — Providers

**Later.** One provider per slice, in this order: Hugging Face, then Kaggle, then Google.

Entry: S6 acceptance checks pass for the first provider. Each following provider starts when the previous provider's slice is done.

The stub that throws in `packages/source-providers` stays until that provider's slice starts.

## S8 — Public beta

**Later.**

Entry: the provider slices you intend to ship are done.

Turn Clerk on as the live auth mode, then follow the documented production deploy. This slice does not add billing, auto-merge, or a second portfolio.
