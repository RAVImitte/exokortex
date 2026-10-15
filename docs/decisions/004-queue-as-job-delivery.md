# ADR-004 — Queue as job delivery

Status: Accepted

## Context

A scan must not run inside the webhook request, and a retried delivery must not scan twice.

## Decision

The queue message is `{ jobId }`. The job row holds the payload, attempts, lock, and idempotency key. Claiming the row is a conditional update.

## Alternatives considered

Putting the repository id and SHA in the message and treating delivery as exactly-once.

## Consequences

Handlers must tolerate duplicate delivery. A lost message is repaired by the cron, which re-enqueues jobs whose locks have expired.
