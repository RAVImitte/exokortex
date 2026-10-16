# Reliability

Status: **Implemented** for scans, agent jobs, and mail. A missing Resend key or a failed send is logged and does not fail the scan or the engineer job. `VALIDATING`, `WAITING_FOR_CI`, and `VERIFYING` stay unused.

D1 is the source of truth. The queue delivers `{ jobId }` and may deliver it twice. The claim update matches `status = 'pending'`, so the second delivery no-ops.

| Mechanism          | Behavior                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Idempotency        | Unique `jobs.idempotency_key` and unique `(repository_id, from_revision, to_revision)` on change events. |
| Retry              | 3 scan attempts. Delay is `30s * 2^(attempt-1)`, capped at 6 hours.                                      |
| Lock               | 15 minutes. The cron at minute 15 releases older locks and re-enqueues them if attempts remain.          |
| Illegal transition | `SCANNING` → `SCANNING` throws. The handler catches that case on retry and continues the scan.           |
| Final failure      | The job is `failed` and the workflow moves to `FAILED` when that transition is legal.                    |
| Cron locally       | Wrangler does not fire cron by itself. `curl http://127.0.0.1:8787/cdn-cgi/local/scheduled` runs it.     |

A database outage is the case that requeues the message. A scan that throws is recorded on the job and acknowledged.
