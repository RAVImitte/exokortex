# GitHub

Status: **Implemented** in the Worker. A live connection is **Partially implemented** until you create the App and fill the secrets below.

ExoKortex uses a GitHub App. It does not store a personal access token. Each API call exchanges an App JWT for an installation token and discards that token.

## App permissions

Create the App under your GitHub account or organization. Set these repository permissions:

| Permission    | Access now | Why                                                                                             |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Metadata      | Read       | List installations and repositories.                                                            |
| Contents      | Read       | Scout and Analyst read changed files, READMEs, and manifests. Write arrives with the Engineer. |
| Pull requests | Read       | Read pull request state. Write arrives with the Engineer.                                       |
| Actions       | Read       | Read the portfolio’s CI result later.                                                           |

Leave other permissions at No access. Write access to contents and pull requests waits for the current slice, S5 in the [slice tracker](../product/roadmap.md). Do not grant it yet.

Subscribe to these events:

- `push`
- `installation`
- `installation_repositories`

## URLs

While `pnpm dev` is running, the browser origin is http://localhost:5173 and the Worker is http://127.0.0.1:8787.

Leave **Request user authorization (OAuth) during installation** unchecked. GitHub then shows a **Setup URL**. That is where the browser goes after install, with `installation_id` and `state`.

| GitHub field   | Local value                                             |
| -------------- | ------------------------------------------------------- |
| Setup URL      | `http://127.0.0.1:8787/api/github/callback`             |
| Callback URL   | Leave empty. This is only the OAuth redirect.           |
| Webhook URL    | See the tunnel section. GitHub cannot call `127.0.0.1`. |
| Webhook secret | A long random string. Same value as `GITHUB_WEBHOOK_SECRET`. |

Check **Redirect on update** so adding or removing repositories hits the Setup URL again.

If OAuth during installation is already checked, GitHub hides the Setup URL. Put `http://127.0.0.1:8787/api/github/callback` in **Callback URL** instead.

`APP_BASE_URL` in `.dev.vars` (`http://localhost:5173`) is not a GitHub field. After the Worker stores the installation, it sends the browser there, to `/repositories`.

After GitHub shows the App’s numeric id, slug, and a PEM private key, put them in `apps/worker/.dev.vars`:

```text
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
APP_BASE_URL=http://localhost:5173
```

The private key may use literal `\n` for newlines. Restart `pnpm dev` after editing `.dev.vars`.

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

The first successful scan of a repository stores the SHA and writes no change event. A later different SHA writes one.
