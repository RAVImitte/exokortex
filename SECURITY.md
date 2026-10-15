# Security

Report a vulnerability privately to the repository owner. Do not open a public issue with exploit detail.

## What to include

What you can reach, which account or tenant, and the smallest request that shows the problem. Do not include your LLM key, a GitHub private key, or a live session cookie.

## Handling

User credentials are never provided directly to LLM agents. See [docs/architecture/security.md](docs/architecture/security.md) for how keys, webhooks, and account deletion work today.

`AUTH_MODE=dev` is for local development. It must not be enabled when `ENVIRONMENT` is not `development`. The Worker refuses that login.
