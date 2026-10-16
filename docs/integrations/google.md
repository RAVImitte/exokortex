# Google

Status: **Implemented**.

Create an OAuth client in Google Cloud. Application type is Web application. Add this authorized redirect URI:

```text
http://localhost:5173/api/google/callback
```

The scope used at connect time is `drive.readonly` plus email, so ExoKortex can list Colab notebooks and name the account. Put the client id and secret in `apps/worker/.dev.vars`:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`APP_BASE_URL` must stay `http://localhost:5173`. Restart `pnpm dev`. On Connections, choose Connect Google and approve access. The callback encrypts the refresh token with `ENCRYPTION_KEY` and stores it on the `google` connection. The API never returns that token. A scan exchanges it for an access token, uses the access token once, and does not store it. Agents never receive either token.

Discovery lists Colab notebooks where the account is an owner and the file is not in the trash. Each notebook is a source. It cannot be marked as the portfolio. The portfolio repository stays on GitHub, and the Engineer still opens the pull request there.

There is no Google webhook. Scan now and the weekly schedule enqueue a separate job. The revision is the Drive head revision. The first scan stores it and writes no change event. A later revision writes one event whose file is the notebook. Files larger than 200 KB are not read.

If the client id, client secret, or `APP_BASE_URL` is missing, Connect Google fails and stores nothing. Disconnect clears the ciphertext.
