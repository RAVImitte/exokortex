# ADR-005 — Four-agent architecture

Status: Accepted

## Context

One prompt that both judges a repository and edits a portfolio mixes discovery with writes.

## Decision

Four roles: Portfolio Scout, Portfolio Analyst, Portfolio Curator, Portfolio Engineer. The orchestrator is deterministic code. Agents return JSON.

## Alternatives considered

A single agent with tools that can open pull requests. A human-only flow with no model.

## Consequences

Prompts exist now. The scan slice does not call them. New project approval stays a human step in front of the Engineer.
