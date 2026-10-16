# Slice tracker

This is the only progress list. A slice is done when its acceptance checks pass. This list is finished, so no slice is current. Publishing is the checklist in [deployment.md](../development/deployment.md).

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

**Done.** Mail is sent only when `RESEND_API_KEY` and `EMAIL_FROM` are set. A missing key does not fail the scan or the engineer job.

Entry: S5 acceptance checks pass.

Acceptance:

- A pending approval sends one email to the user. The message names the repository and links to Approvals.
- Opening a pull request sends one email with the pull request URL.
- A rejection, an unchanged classification, and a noise skip do not send mail.
- Sending mail never includes API keys or GitHub tokens.

## S7 — Hugging Face

**Done.** A read token discovers the account’s own models, datasets, and spaces. They are source repositories. The portfolio stays a GitHub repository.

Entry: S6 acceptance checks pass.

Acceptance:

- Pasting a read token stores it encrypted. The API does not return the token.
- Discovery stores that account’s models, datasets, and spaces. Repositories owned by an org are not included.
- Those rows cannot be marked `PORTFOLIO`.
- The first scan stores the commit SHA and writes no change event. A later differing SHA writes one event.
- A scan for one connection does not call the other provider.
- Scout, Analyst, Curator, approval, and the GitHub pull request stay the same path.
- A rejection, an unchanged classification, and a noise skip still send no mail.

## S8 — Kaggle

**Done.** An API token discovers the account’s own datasets and notebooks. They are source repositories. The portfolio stays a GitHub repository.

Entry: S7 acceptance checks pass.

Acceptance:

- Pasting an API token stores it encrypted. The API does not return the token.
- Discovery stores that account’s datasets and notebooks. Another owner’s rows are skipped.
- Those rows cannot be marked `PORTFOLIO`.
- The first scan stores the version and writes no change event. A later version writes one event.
- A dataset change lists files whose size differs. A notebook change names the source file.
- A scan for one connection does not call the other providers.
- Scout, Analyst, Curator, approval, and the GitHub pull request stay the same path.

## S9 — Google

**Done.** OAuth stores a refresh token and discovers Colab notebooks the account owns. They are source repositories. The portfolio stays a GitHub repository.

Entry: S8 acceptance checks pass.

Acceptance:

- Connecting stores the refresh token encrypted. The API does not return it. Each scan mints an access token and does not store that token.
- Discovery stores Colab notebooks owned by that account. Shared files owned by someone else are not included.
- Those rows cannot be marked `PORTFOLIO`.
- The first scan stores the Drive revision and writes no change event. A later revision writes one event naming the notebook.
- A scan for one connection does not call the other providers.
- Scout, Analyst, Curator, approval, and the GitHub pull request stay the same path.
- Missing OAuth client settings fail the connect link and store nothing.

## S10 — Public beta

**Done.** Production sign-in is Clerk. Publishing stays the checklist in [deployment.md](../development/deployment.md). This slice does not add billing, auto-merge, or a second portfolio, and it does not publish the Worker.

Entry: the provider slices you intend to ship are done.

Acceptance:

- Dev login stays refused unless `ENVIRONMENT=development` and `AUTH_MODE=dev`.
- With Clerk enabled, API calls send the session token. The user row stores the primary email.
- Sign out ends the Clerk session.
- `APP_BASE_URL` is the only browser origin accepted for that session token.
