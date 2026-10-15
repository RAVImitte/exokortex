# ADR-002 — Bring your own LLM

Status: Accepted

## Context

Portfolio analysis is optional inference. ExoKortex should not resell model tokens or choose one vendor for every user.

## Decision

The user saves an OpenAI-compatible base URL, model, and API key. The key is encrypted in D1. The Worker decrypts it only for a call it makes. Agents never receive the key.

## Alternatives considered

A single platform key. A hosted open-weight model inside the Worker. Both put inference cost and vendor lock-in on ExoKortex.

## Consequences

A user without a key cannot run agents. The test call only checks that the model replies with `pong`. Agent execution is still planned.
