# User flow

Status: steps 1–4 are **Implemented**. Steps 5–8 are **Planned**.

1. Sign in. Locally this is an email form. In production it is Clerk.
2. Connect GitHub by installing the ExoKortex GitHub App. The callback stores the installation id, encrypted, and discovers repositories.
3. Mark one repository as the portfolio. Mark anything you do not want watched as excluded. A name like `portfolio` is only a suggestion. It is not excluded automatically.
4. Scan. The first scan records the latest commit on each source repository. Later scans record a change event when that commit differs. Scan now, a push webhook, and the weekly schedule all enqueue the same kind of job.
5. Scout and Analyst read the change and produce evidence. Not running yet.
6. Curator classifies the change as unchanged, an update, a new project, or ignore. A new project waits for you. Not running yet.
7. You approve on the Approvals screen. That screen is a placeholder.
8. Portfolio Engineer opens a pull request on the portfolio repository. You merge. Your CI deploys. Not running yet.

Disconnect a connection or delete the account from Settings. Deleting the account removes that user’s rows.
