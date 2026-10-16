# ADR-011 — Auth verifier

Status: Accepted

## Context

Production should use Clerk. Local development should not require a Clerk account.

## Decision

`identify()` is the only place that reads a session. `AUTH_MODE=dev` accepts an HMAC cookie and is refused unless `ENVIRONMENT=development`. `AUTH_MODE=clerk` uses `@clerk/backend`. The browser sends the Clerk session token on each API call. The Worker stores that user's primary email.

## Alternatives considered

Clerk in every environment. A homemade password store.

## Consequences

Dev subjects are `dev:<email>`. Clerk subjects are Clerk user ids. The email column is the Clerk primary email address.
