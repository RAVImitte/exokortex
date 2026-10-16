# Security

User credentials are never provided directly to LLM agents.

## Tenant isolation

**Implemented.** Queries take `userId` and bind it in SQL. A webhook only enqueues a scan when the installation’s connection and the repository row belong to the same user.

## Credential encryption

**Implemented.** `ENCRYPTION_KEY` is 32 bytes, base64, and lives in a Worker secret or local `.dev.vars`. AES-GCM ciphertext includes a version prefix. GitHub installation tokens are minted per request and are not stored.

## GitHub permissions

**Implemented** as the App you create. Metadata is Read. Contents and Pull requests are Write so the Engineer can open a pull request. Actions stays Read. Setup steps are in [github.md](../integrations/github.md).

Webhook bodies are checked with HMAC-SHA256 (`X-Hub-Signature-256`) before JSON is trusted. A missing or wrong signature is 401.

## LLM keys

**Implemented.** The key is encrypted on write and omitted from `GET /api/llm-config`. The test endpoint decrypts it inside the Worker, calls the user’s base URL, and returns `{ ok, model }` only.

## Sessions

**Implemented.** Dev cookies are HttpOnly, `SameSite=Lax`, and HMAC-signed. The GitHub install `state` is the same seal, bound to the database user id, and expires in 15 minutes. Clerk verification is **Partially implemented** behind `AUTH_MODE=clerk`.

`SameSite=Lax` is the CSRF control for cookie-authenticated browser calls. There is no separate CSRF token. **Planned:** rate limiting. It is not in this slice.

## Audit, disconnect, deletion

**Implemented.** Workflow transitions write `audit_events`. Disconnect clears the connection ciphertext and marks it revoked. Delete account removes the user row and, by foreign key, the rows that belong to that user.

## MCP and tools

**Not implemented.** When agents gain tools, those tools will not receive the encryption key, the GitHub private key, installation tokens, or the LLM key. The orchestrator will attach credentials itself for the calls it makes.
