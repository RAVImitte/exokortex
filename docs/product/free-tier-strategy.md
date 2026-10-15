# Free-tier limits

These limits are in `packages/core/src/limits.ts` and are **Implemented** as constants. Enforcement today is the repository cap during discovery. The rest apply when those features exist.

| Limit                                      | Value                           |
| ------------------------------------------ | ------------------------------- |
| Repositories per user                      | 100                             |
| Portfolio projects                         | 200                             |
| Curator follow-up questions                | 5                               |
| Engineer attempts per change               | 2                               |
| Scan, Scout, Analyst, and Curator attempts | 3                               |
| Default scan frequency                     | Weekly (also biweekly, monthly) |
| Job lock timeout                           | 15 minutes                      |

One Worker serves the API and the static dashboard so the free tier stays a single Cloudflare deployment. There is no separate database server.

ExoKortex does not include model usage. You pay your LLM provider directly.

Email (Resend), bot protection (Turnstile), and billing are **Planned** or out of scope. Billing is not a goal of the bootstrap.
