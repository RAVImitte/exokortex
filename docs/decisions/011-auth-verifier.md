# ADR-011 — Auth verifier

Status: Accepted

## Context

Production should use Clerk. Local development should not require a Clerk account.

## Decision

`identify()` is the only place that reads a session. `AUTH_MODE=dev` accepts an HMAC cookie and is refused unless `ENVIRONMENT=development`. `AUTH_MODE=clerk` uses `@clerk/backend`.

## Alternatives considered

Clerk in every environment. A homemade password store.

## Consequences

Dev subjects are `dev:<email>`. Clerk subjects are Clerk user ids. The email column for a Clerk user may equal that id until a profile fetch is added.
