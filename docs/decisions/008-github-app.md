# ADR-008 — GitHub App instead of personal access tokens

Status: Accepted

## Context

A stored personal access token is broader than this product and painful to rotate.

## Decision

The user creates a GitHub App. ExoKortex stores the installation id, encrypted. Installation tokens are minted per request and not written to D1. The App private key is a Worker secret.

## Alternatives considered

OAuth user tokens. A fine-grained personal access token pasted into settings.

## Consequences

Setup is a documented manual step. Webhooks identify the installation. Write permissions wait until the Engineer needs them.
