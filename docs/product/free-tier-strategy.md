# Free-tier limits

These limits are in `packages/core/src/limits.ts`. Discovery enforces the repository cap. Curator follow-ups and job attempt counts are enforced. The portfolio-project cap is a constant and is not enforced when a project row is created.

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

Email is sent through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set. Bot protection (Turnstile) is **Planned**. Billing is out of scope.
