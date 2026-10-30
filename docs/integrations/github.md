# GitHub

Status: **Implemented** in the Worker. A live connection is **Partially implemented** until you create the App and fill the secrets below.

ExoKortex uses a GitHub App. It does not store a personal access token. Each API call exchanges an App JWT for an installation token and discards that token.

## App permissions

Create the App under your GitHub account or organization. Set these repository permissions:

| Permission    | Access now | Why                                                                                  |
| ------------- | ---------- | ------------------------------------------------------------------------------------ |
| Metadata      | Read       | List installations and repositories.                                                 |
| Contents      | Write      | Scout and Analyst read files. The Engineer writes one project-data file on a branch. |
| Pull requests | Write      | The Engineer opens a pull request. Nothing in ExoKortex merges it.                   |
| Actions       | Read       | Read the portfolio’s CI result later.                                                |

Portfolio pull requests use the branch saved on the portfolio repository. GitHub may still report a different default branch. A later discovery does not replace the portfolio branch.

Leave other permissions at No access. If the App was created with Contents or Pull requests set to Read, change both to Read and write and save the App. GitHub then asks you to approve the new permissions on the existing installation. Until that approval, the installation stays Read and a pull request returns 403. Metadata stays Read.

Subscribe to these events:

- `push`
- `installation`
- `installation_repositories`

## URLs

While `pnpm dev` is running, the browser origin is http://localhost:5173 and the Worker is http://127.0.0.1:8787.

Leave **Request user authorization (OAuth) during installation** unchecked. GitHub then shows a **Setup URL**. ExoKortex receives the installation id there, then starts user authorization and verifies that the user can access that installation before saving it. Both steps use expiring, signed state bound to the browser with an HttpOnly cookie. An installation id alone never grants access.

| GitHub field   | Local value                                                  |
| -------------- | ------------------------------------------------------------ |
| Setup URL      | `http://localhost:5173/api/github/callback`                  |
| Callback URL   | `http://localhost:5173/api/github/callback`                  |
| Webhook URL    | See the tunnel section. GitHub cannot call `127.0.0.1`.      |
| Webhook secret | A long random string. Same value as `GITHUB_WEBHOOK_SECRET`. |

Check **Redirect on update** so adding or removing repositories hits the Setup URL again.

The Setup URL, Callback URL, and `APP_BASE_URL` must use the same browser host. Locally, Vite proxies these callbacks to the Worker. Do not mix `localhost` and `127.0.0.1`, because the browser's connection cookie is host-specific. If OAuth during installation was checked, uncheck it and configure both URLs above.

`APP_BASE_URL` in `.dev.vars` (`http://localhost:5173`) is not a GitHub field. After the Worker stores the installation, it sends the browser there, to `/repositories`.

After GitHub shows the App’s numeric id, slug, and a PEM private key, put them in `apps/worker/.dev.vars`:

```text
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
APP_BASE_URL=http://localhost:5173
```

The client id is different from the numeric app id. Generate a client secret in the GitHub App settings. The user access token is used only to verify installation access and is never stored. The private key may use literal `\n` for newlines. Restart `pnpm dev` after editing `.dev.vars`.

In the dashboard, Connections → Connect GitHub opens `https://github.com/apps/<slug>/installations/new` with a signed `state` that expires in 15 minutes. The callback discovers up to 100 repositories (10 pages of 100). Past that, discovery stops at the cap.

## Webhook tunnel

GitHub must reach `POST /api/github/webhook` on the Worker. Pick one tunnel.

### cloudflared

```powershell
cloudflared tunnel --url http://127.0.0.1:8787
```

Set the App webhook URL to `https://<the-host-cloudflared-prints>/api/github/webhook`. Content type JSON. The secret must match `.dev.vars`.

### smee

Create a channel at https://smee.io and set that URL as the webhook URL. Forward it to the Worker:

```powershell
npx smee-client --url https://smee.io/<your-channel> --target http://127.0.0.1:8787/api/github/webhook
```

## What a push does

The Worker checks `X-Hub-Signature-256`. A valid `push` with an installation id, repository id, and `after` SHA enqueues `scan:{userId}:{repositoryId}:{sha}`. The same delivery twice does not create two jobs.

The first successful scan of a repository stores the SHA and writes no change event. A later different SHA writes one. Full manual and scheduled scans also rediscover repositories. A push from an unknown repository triggers discovery, so adding a repository does not require reconnecting.
