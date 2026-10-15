# ADR-010 — Vite single-page app

Status: Accepted

## Context

The dashboard is a signed-in tool, not a content site. The API already lives on the Worker.

## Decision

The UI is React and Vite. Production is static files in `apps/web/dist`, served by the Worker. In dev, Vite on port 5173 proxies `/api` to Wrangler on port 8787.

## Alternatives considered

Next.js as a second server. Serving JSX from the Worker without a build.

## Consequences

There is one deployable. Clerk’s browser SDK is loaded only when `VITE_AUTH_MODE=clerk`.
