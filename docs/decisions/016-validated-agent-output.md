# ADR-016 — Validated agent output

Status: Accepted

## Context

Model text is not a command. Acting on a parse failure can edit the wrong project.

## Decision

Agent replies are JSON checked with Zod. One retry on invalid output. The orchestrator does not act on output that still fails.

## Alternatives considered

Free-form text parsed with heuristics. Trusting the model because the prompt said “JSON only”.

## Consequences

The Curator schema is implemented and tested. Scout, Analyst, and Engineer schemas grow when those agents run.
