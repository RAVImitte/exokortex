# ADR-013 — Workflow state in D1

Status: Accepted

## Context

Scans and later agent steps are a state machine that must be queryable and recoverable.

## Decision

Workflow rows live in D1. `@exokortex/core` lists legal transitions and throws on any other pair. Cloudflare Workflows is not used. The queue still only carries a job id.

## Alternatives considered

Cloudflare Workflows as the engine. An implicit status string with no transition check.

## Consequences

The scan slice uses `SCAN_PENDING` → `SCANNING` → `COMPLETED` or `FAILED`. Later states exist so code cannot skip into them.
