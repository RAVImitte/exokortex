# ADR-014 — Hand-written SQL

Status: Accepted

## Context

The data model is small, and every query must include the tenant.

## Decision

Numbered `.sql` migrations and repository classes. No ORM. `wrangler d1 migrations apply` runs the files.

## Alternatives considered

Drizzle or Prisma generating SQL and a client.

## Consequences

Schema changes are reviewable as SQL. A new query is a new method, not a generic filter object.
