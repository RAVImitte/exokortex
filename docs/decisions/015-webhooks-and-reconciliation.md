# ADR-015 — Webhooks and weekly reconciliation

Status: Accepted

## Context

Push webhooks are fast and sometimes missed. Polling every repository on every request is wasteful.

## Decision

A verified `push` webhook enqueues a scan for that repository and SHA. A weekly schedule (also biweekly or monthly) scans everything due. The same hourly cron re-enqueues jobs locked longer than 15 minutes.

## Alternatives considered

Webhooks only. A fixed hourly poll of every repository.

## Consequences

The first connect and Scan now use their own idempotency keys, so they do not collide with a webhook for the same SHA.
