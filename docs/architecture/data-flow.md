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

1. Connect stores an encrypted credential and upserts repositories. GitHub stores `{ installationId }`. Hugging Face and Kaggle store `{ token }`. Google stores `{ refreshToken }`. New rows are role `SOURCE`. Upsert does not overwrite `role` or `last_revision`.
2. A job is inserted with an idempotency key. A duplicate key does not create a second workflow or a second queue message. Scan now and the schedule insert one job per connection.
3. The consumer claims the row (`pending` → `locked`) and moves the workflow `SCAN_PENDING` → `SCANNING`.
4. For each source repository on that connection, the handler reads the latest revision. GitHub and Hugging Face use a commit SHA. Kaggle uses the dataset or notebook version. Google uses the Drive revision.
   - No previous revision: store it. No change event. This is the baseline.
   - Same revision: touch `last_scanned_at` only.
   - Different revision: insert one `change_events` row, then store the new revision.
5. Portfolio and excluded repositories are skipped. Exclusion matches role, repository id, and normalized URL. Hugging Face, Kaggle, and Google rows cannot be marked `PORTFOLIO`.
6. When a change is open and an LLM key is saved, the same job runs Scout, then Analyst, then Curator. Noise is stored and skipped unless Activity forces analysis. `NEW_PROJECT` and `UPDATED_PROJECT` leave the workflow at `PENDING_APPROVAL`. Otherwise the workflow becomes `COMPLETED`. A scan with no open change and nothing waiting for Curator completes without a model call.
7. Approving the last waiting item enqueues an engineer job and moves the workflow to `ENGINEERING`. That job opens one pull request and then moves the workflow to `COMPLETED`. A rejection enqueues nothing. Retries exhausted move a failed job to `FAILED` when that transition is legal.

Setting a repository to `PORTFOLIO` demotes the previous portfolio to `SOURCE`. A repository whose name looks like a portfolio is only a suggestion (`suggestsPortfolio`). It is not auto-excluded. That suggestion is **Partially implemented**: the function exists, and the UI does not surface it yet.

## Secrets at rest

LLM keys, GitHub installation ids, Hugging Face tokens, Kaggle tokens, and Google refresh tokens are AES-GCM ciphertext (`v1:<iv>:<cipher>`). The list APIs return connection status and LLM provider, base URL, and model. They do not return ciphertext.
