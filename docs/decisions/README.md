# Architecture decisions

| ADR                                          | Decision                                        | Status   |
| -------------------------------------------- | ----------------------------------------------- | -------- |
| [001](001-serverless-architecture.md)        | One Cloudflare Worker                           | Accepted |
| [002](002-byo-llm.md)                        | Users bring their own model key                 | Accepted |
| [003](003-d1-source-of-truth.md)             | D1 is the only durable store                    | Accepted |
| [004](004-queue-as-job-delivery.md)          | Queue messages carry a job id                   | Accepted |
| [005](005-four-agent-architecture.md)        | Scout, Analyst, Curator, Engineer               | Accepted |
| [006](006-portfolio-repository-isolation.md) | One explicit portfolio repository               | Accepted |
| [007](007-existing-cicd-owns-deployment.md)  | The user’s CI deploys the portfolio             | Accepted |
| [008](008-github-app.md)                     | GitHub App, not a stored personal token         | Accepted |
| [009](009-one-user-one-tenant.md)            | One user is one tenant                          | Accepted |
| [010](010-vite-spa.md)                       | React and Vite, served as Worker assets         | Accepted |
| [011](011-auth-verifier.md)                  | Clerk behind one verifier, plus local dev login | Accepted |
| [012](012-local-wrangler.md)                 | Local dev is Wrangler, not Docker               | Accepted |
| [013](013-workflow-in-d1.md)                 | Workflow state is a D1 state machine            | Accepted |
| [014](014-hand-written-sql.md)               | Hand-written SQL, no ORM                        | Accepted |
| [015](015-webhooks-and-reconciliation.md)    | Push webhooks plus a weekly reconciliation      | Accepted |
| [016](016-validated-agent-output.md)         | Agent JSON is validated with Zod                | Accepted |
| [017](017-pr-only-merge.md)                  | The user merges pull requests                   | Accepted |
