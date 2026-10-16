# System context

## People and systems

| Actor        | Relationship                                                                        | Status                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User         | Signs in, marks a portfolio repository, approves changes, and merges pull requests. | Sign-in, roles, approval, and opening a pull request are **Implemented**. The user merges.                                                                          |
| GitHub       | Installation, metadata, file reads and writes, pull requests, push webhooks.        | **Implemented**.                                                                                                                                                    |
| LLM provider | OpenAI-compatible chat completions, paid by the user.                               | Scout, Analyst, Curator, and Engineer calls are **Implemented**.                                                                                                    |
| Clerk        | Production sign-in.                                                                 | **Implemented** when `AUTH_MODE=clerk`. The session token is checked on each API call, and the primary email is stored.                                             |
| User CI      | Deploys the portfolio after the user merges.                                        | **Planned**. ExoKortex will not deploy the portfolio itself.                                                                                                        |
| Resend       | Mail when an approval is waiting and when a pull request opens.                     | **Implemented** when `RESEND_API_KEY` and `EMAIL_FROM` are set. A missing key skips mail.                                                                           |
| Turnstile    | Bot checks.                                                                         | **Planned**.                                                                                                                                                        |
| Hugging Face | Models, datasets, and spaces the user owns, read with their token.                  | **Implemented**. The token is encrypted. Org repos are not discovered. The portfolio stays on GitHub.                                                               |
| Kaggle       | Datasets and notebooks the user owns, read with their API token.                    | **Implemented**. The token is encrypted. Another owner’s rows are skipped. The portfolio stays on GitHub.                                                           |
| Google       | Colab notebooks the user owns, read with a Drive refresh token.                     | **Implemented**. The refresh token is encrypted. An access token is minted per scan and not stored. Shared files are not discovered. The portfolio stays on GitHub. |

## Trust boundary

The Worker holds the encryption key, the GitHub App private key, the Google client secret, decrypted LLM keys, and source tokens only in memory for the call that needs them. The browser receives session cookies and public metadata. It never receives the LLM key again after save, a GitHub installation token, or a source token again after connect.
