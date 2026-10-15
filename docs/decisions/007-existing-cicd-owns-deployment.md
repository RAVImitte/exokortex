# ADR-007 — Existing CI/CD owns deployment

Status: Accepted

## Context

Users already deploy their portfolios with GitHub Actions or another pipeline. A second deployer would fork that process.

## Decision

The Engineer, when it exists, opens a pull request. The user merges. The user’s existing CI deploys. ExoKortex does not deploy the portfolio.

## Alternatives considered

Pushing to the default branch. Calling the user’s host API after a green build.

## Consequences

ExoKortex needs to read Actions later to know CI finished. It does not need deploy credentials.
