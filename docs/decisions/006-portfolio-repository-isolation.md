# ADR-006 — Portfolio repository isolation

Status: Accepted

## Context

The portfolio repository changes because ExoKortex updates it. Treating those commits as new projects would loop.

## Decision

The user marks one repository `PORTFOLIO`. Marking another demotes the previous one to `SOURCE`. Portfolio and `EXCLUDED` repositories never produce change events. A name that looks like a portfolio is only a suggestion.

## Alternatives considered

Auto-excluding any repository named `portfolio`. Allowing several portfolios per user.

## Consequences

Semantic detection is partially implemented: the helper exists, and the product does not auto-exclude. One portfolio per user is a product limit.
