import { createAppJwt } from "./jwt.js";

const API = "https://api.github.com";

export interface GitHubAppConfig {
  appId: string;
  privateKeyPem: string;
  fetch?: typeof fetch;
}

export class GitHubClient {
  private readonly tokens = new Map<string, Promise<string>>();

  constructor(private readonly config: GitHubAppConfig) {}

  async appInstallations(): Promise<{ id: number }[]> {
    const jwt = await createAppJwt(this.config.appId, this.config.privateKeyPem);
    return this.request<{ id: number }[]>(`/app/installations?per_page=100`, jwt);
  }

  async appInstallation(
    installationId: string,
  ): Promise<{ account?: { login?: string; type?: string } }> {
    const jwt = await createAppJwt(this.config.appId, this.config.privateKeyPem);
    return this.request(`/app/installations/${installationId}`, jwt);
  }

  async installationToken(installationId: string): Promise<string> {
    const cached = this.tokens.get(installationId);
    if (cached) return cached;
    const pending = this.mintInstallationToken(installationId);
    this.tokens.set(installationId, pending);
    try {
      return await pending;
    } catch (error) {
      this.tokens.delete(installationId);
      throw error;
    }
  }

  private async mintInstallationToken(installationId: string): Promise<string> {
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
