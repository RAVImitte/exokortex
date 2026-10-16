# Changelog

## Unreleased

- Scout, Analyst, and Curator run in the scan job. The last approval runs Portfolio Engineer and opens a pull request.
- Hugging Face, Kaggle, and Google Colab are source connections. The portfolio stays one GitHub repository.
- Approval-waiting and pull-request-opened mail when Resend is configured.
- Clerk sign-in sends the session token and stores the primary email when `AUTH_MODE=clerk`.

## 0.1.0

First vertical slice.

- Local Worker, D1, queue, and cron.
- Dev login, dashboard, repository roles, connections, activity, LLM key storage, and account deletion.
- GitHub App install, discovery, signed webhooks, and idempotent scans. The first scan is a baseline.
- Agent prompts and Curator JSON validation. Agents do not run.
