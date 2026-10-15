# ADR-017 — Pull-request-only merge

Status: Accepted

## Context

An automatic merge can publish a portfolio change the user has not seen.

## Decision

The Engineer opens a pull request. The user merges. Auto-merge is planned and off.

## Alternatives considered

Merging when CI is green. Pushing commits straight to the default branch.

## Consequences

The product needs pull request write permission only in the Engineer phase. Until then the App stays read-oriented.
