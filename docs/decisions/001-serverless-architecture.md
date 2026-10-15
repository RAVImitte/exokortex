# ADR-001 — Serverless architecture

Status: Accepted

## Context

The first release has to run on a free-tier host without a always-on server, a container cluster, or a separate database process.

## Decision

One Cloudflare Worker serves the API and the built dashboard. D1, Queues, and Cron Triggers are the platform services it uses.

## Alternatives considered

A long-running Node server and Postgres. A Next.js server. Both need a process that stays up and a database you operate.

## Consequences

Local development is Wrangler. There is no Docker Compose file. Cold starts and Worker CPU limits bound how much work a single request may do, so scans run on the queue.
