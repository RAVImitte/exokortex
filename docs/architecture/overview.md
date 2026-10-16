# Architecture overview

Status: **Implemented** for scanning, Scout, Analyst, Curator, approval, and the Portfolio Engineer pull request.

ExoKortex is one Cloudflare Worker. The dashboard is a static React app. D1 holds every durable fact. A queue message is only a job id.

```text
React dashboard
    → Hono routes
        → repository classes
            → D1
        → queue { jobId }
            → scan handler
                → GitHub, Hugging Face, Kaggle, or Google
                → Scout, Analyst, Curator
            → engineer handler
                → GitHub pull request
```

An hourly cron releases stuck locks and enqueues due scans.

Packages under `packages/` do not import the Worker. The Worker is the only composition root. See [tech-stack.md](tech-stack.md) for the library list and [data-flow.md](data-flow.md) for the scan path.
