# ADR-012 — Local Wrangler, no Docker

Status: Accepted

## Context

The production runtime is a Worker and D1. A Docker Compose stack would be a different runtime.

## Decision

`pnpm dev` runs Wrangler and Vite. `pnpm db:migrate:local` applies SQL to local D1. There is no `docker-compose.yml`.

## Alternatives considered

Postgres in Docker for local dev, with a second SQL dialect.

## Consequences

Contributors need Node and pnpm, not Docker. Cron does not fire by itself under `wrangler dev`.
