export async function verifyInstallationAccess(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  installationId: string;
  fetch?: typeof fetch;
}): Promise<void> {
  const request = input.fetch ?? fetch;
  const response = await request("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  });
  if (!response.ok) throw new Error("GitHub user authorization failed");
  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("GitHub user authorization failed");
  // This endpoint must use a user token, never the app's installation token.
  const access = await request(
    `https://api.github.com/user/installations/${encodeURIComponent(input.installationId)}/repositories?per_page=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.access_token}`,
        "User-Agent": "exokortex",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!access.ok) throw new Error("You do not have access to this GitHub installation");
  // The short-lived user token is used only for this check and is never stored.
}
