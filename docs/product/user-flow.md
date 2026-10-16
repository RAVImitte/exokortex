# User flow

Status: steps 1–8 are **Implemented**. What comes next is the [slice tracker](roadmap.md).

1. Sign in. Locally this is an email form. In production it is Clerk.
2. Connect GitHub by installing the ExoKortex GitHub App. The callback stores the installation id, encrypted, and discovers repositories.
3. Mark one repository as the portfolio. Mark anything you do not want watched as excluded. A name like `portfolio` is only a suggestion. It is not excluded automatically.
4. Scan. The first scan records the latest commit on each source repository. Later scans record a change event when that commit differs. Scan now, a push webhook, and the weekly schedule all enqueue the same kind of job.
5. Scout and Analyst read the change and produce evidence. Noise is stored and skipped unless you force analysis from Activity.
6. Curator classifies the change as unchanged, an update, a new project, or ignore. A new or updated project waits for you.
7. You approve or reject on the Approvals screen. Approving a new project creates it in the database. Rejecting records the decision and does not open a pull request.
8. When you approve the last waiting item, Portfolio Engineer opens a pull request on the portfolio repository. Approvals shows the link. You merge. Your CI deploys.

Disconnect a connection or delete the account from Settings. Deleting the account removes that user’s rows.
