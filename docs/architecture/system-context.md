# System context

## People and systems

| Actor                        | Relationship                                                                        | Status                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| User                         | Signs in, marks a portfolio repository, approves changes, and merges pull requests. | Sign-in, roles, approval, and opening a pull request are **Implemented**. The user merges. |
| GitHub                       | Installation, metadata, file reads and writes, pull requests, push webhooks.        | **Implemented**.                                                                           |
| LLM provider                 | OpenAI-compatible chat completions, paid by the user.                               | Scout, Analyst, Curator, and Engineer calls are **Implemented**.                           |
| Clerk                        | Production sign-in.                                                                 | **Partially implemented**. Used only when `AUTH_MODE=clerk`.                               |
| User CI                      | Deploys the portfolio after the user merges.                                        | **Planned**. ExoKortex will not deploy the portfolio itself.                               |
| Resend, Turnstile            | Mail and bot checks.                                                                | **Planned**.                                                                               |
| Hugging Face, Kaggle, Google | Extra source providers.                                                             | **Not implemented**.                                                                       |

## Trust boundary

The Worker holds the encryption key, the GitHub App private key, and decrypted LLM keys only in memory for one call. The browser receives session cookies and public metadata. It never receives the LLM key again after save, and it never receives a GitHub installation token.
