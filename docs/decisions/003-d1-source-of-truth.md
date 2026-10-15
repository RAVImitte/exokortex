# ADR-003 — D1 as source of truth

Status: Accepted

## Context

Scans, approvals, and retries must survive a crashed consumer. A queue is a poor record of what already happened.

## Decision

D1 holds users, connections, repositories, revisions, change events, jobs, and workflows. If D1 and the queue disagree, D1 wins.

## Alternatives considered

Postgres, an ORM-owned schema, or treating the queue payload as the record.

## Consequences

Migrations are SQL files applied with Wrangler. Local and production are the same engine. Features that need a second store are out of scope until an ADR says otherwise.
