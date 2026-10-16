# User flow

Status: steps 1–8 are **Implemented**. Publishing is the checklist in [deployment.md](../development/deployment.md).

1. Sign in. Locally this is an email form. In production it is Clerk.
2. Connect GitHub by installing the ExoKortex GitHub App. The callback stores the installation id, encrypted, and discovers repositories. Connect Hugging Face with a read token, Kaggle with an API token, or Google with OAuth. Those discover models, datasets, spaces, Kaggle datasets and notebooks, and Colab notebooks you own. Those stay sources. The portfolio is still one GitHub repository.
3. Mark one GitHub repository as the portfolio. Its branch is the one your site deploys. Change it on Repositories when production is not GitHub's default branch. Mark anything you do not want watched as excluded. A name like `portfolio` is only a suggestion. It is not excluded automatically.
4. Scan. The first scan records the latest revision on each source repository. Later scans record a change event when that revision differs. Scan now and the weekly schedule enqueue one job per connection. A GitHub push webhook enqueues a scan for that repository only. Hugging Face, Kaggle, and Google have no webhook.
5. Scout and Analyst read the change and produce evidence. Noise is stored and skipped unless you force analysis from Activity.
6. Curator classifies the change as unchanged, an update, a new project, or ignore. A new or updated project waits for you.
7. You approve or reject on the Approvals screen. Approving a new project creates it in the database. Rejecting records the decision and does not open a pull request.
8. When you approve the last waiting item, Portfolio Engineer opens a pull request against the portfolio branch. Approvals shows the link. You merge. Your CI deploys.

Disconnect a connection or delete the account from Settings. Deleting the account removes that user’s rows.
