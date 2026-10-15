# Data flow

## Tenancy

**Implemented.** One user is one tenant. `users.auth_subject` is `dev:<email>` or the Clerk user id. Every owned table references `users.id` with `ON DELETE CASCADE`.

Columns beyond the founding brief, all **Implemented**:

- `users.auth_subject`, `users.scan_frequency`, `users.next_scan_at`
- `connections.external_installation_id`
- `jobs.idempotency_key`, `jobs.last_error`, `jobs.workflow_id`, `jobs.max_attempts`
- `workflows` and `audit_events`

## Scan

**Implemented.**

1. Connect stores an encrypted `{ installationId }` and upserts repositories. New rows are role `SOURCE`. Upsert does not overwrite `role` or `last_revision`.
2. A job is inserted with an idempotency key. A duplicate key does not create a second workflow or a second queue message.
3. The consumer claims the row (`pending` → `locked`) and moves the workflow `SCAN_PENDING` → `SCANNING`.
4. For each source repository, the handler reads the latest commit SHA.
   - No previous SHA: store it. No change event. This is the baseline.
   - Same SHA: touch `last_scanned_at` only.
   - Different SHA: insert one `change_events` row, then store the new SHA.
5. Portfolio and excluded repositories are skipped. Exclusion matches role, repository id, and normalized URL.
6. The workflow becomes `COMPLETED`, or `FAILED` after retries are exhausted.

Setting a repository to `PORTFOLIO` demotes the previous portfolio to `SOURCE`. A repository whose name looks like a portfolio is only a suggestion (`suggestsPortfolio`). It is not auto-excluded. That suggestion is **Partially implemented**: the function exists, and the UI does not surface it yet.

## Secrets at rest

LLM keys and GitHub installation ids are AES-GCM ciphertext (`v1:<iv>:<cipher>`). The list APIs return connection status and LLM provider, base URL, and model. They do not return ciphertext.
