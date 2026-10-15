import { createAppJwt } from "./jwt.js";

const API = "https://api.github.com";

export interface GitHubAppConfig {
  appId: string;
  privateKeyPem: string;
  fetch?: typeof fetch;
}

export class GitHubClient {
  constructor(private readonly config: GitHubAppConfig) {}

  async installationToken(installationId: string): Promise<string> {
    const jwt = await createAppJwt(this.config.appId, this.config.privateKeyPem);
    const data = await this.request<{ token: string }>(
      `/app/installations/${installationId}/access_tokens`,
      jwt,
      { method: "POST" },
    );
    return data.token;
  }

  async request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const response = await (this.config.fetch ?? fetch)(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "exokortex",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`GitHub ${path} returned ${response.status}`);
    return (await response.json()) as T;
  }
}
