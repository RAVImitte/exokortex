import type {
  DiscoveredRepository,
  FileContent,
  ProviderConnection,
  ProviderRepository,
  RepositoryChange,
  Revision,
  SearchResult,
  SourceProvider,
} from "@exokortex/source-providers";
import { GitHubClient, type GitHubAppConfig } from "./client.js";

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
  default_branch: string | null;
}

export class GitHubProvider implements SourceProvider {
  readonly name = "github";
  private readonly client: GitHubClient;

  constructor(config: GitHubAppConfig) {
    this.client = new GitHubClient(config);
  }

  async discoverRepositories(connection: ProviderConnection): Promise<DiscoveredRepository[]> {
    const token = await this.client.installationToken(connection.installationId);
    const found: DiscoveredRepository[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const body = await this.client.request<{ repositories?: GitHubRepo[] }>(
        `/installation/repositories?per_page=100&page=${page}`,
        token,
      );
      const batch = body.repositories ?? [];
      for (const repo of batch) {
        found.push({
          externalId: String(repo.id),
          name: repo.full_name,
          url: repo.html_url,
          defaultBranch: repo.default_branch ?? "main",
        });
      }
      if (batch.length < 100) break;
    }
    return found;
  }

  async getLatestRevision(
    connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<Revision> {
    const token = await this.client.installationToken(connection.installationId);
    const commit = await this.client.request<{ sha: string }>(
      `/repos/${repository.name}/commits/${encodeURIComponent(repository.defaultBranch)}`,
      token,
    );
    return { sha: commit.sha, branch: repository.defaultBranch };
  }

  async getChanges(
    connection: ProviderConnection,
    repository: ProviderRepository,
    fromRevision: string,
    toRevision: string,
  ): Promise<RepositoryChange[]> {
    const token = await this.client.installationToken(connection.installationId);
    const compare = await this.client.request<{ files?: { filename: string; status: string }[] }>(
      `/repos/${repository.name}/compare/${fromRevision}...${toRevision}`,
      token,
    );
    return (compare.files ?? []).map((file) => ({ path: file.filename, status: file.status }));
  }

  async getFile(
    connection: ProviderConnection,
    repository: ProviderRepository,
    path: string,
    revision?: string,
  ): Promise<FileContent> {
    const token = await this.client.installationToken(connection.installationId);
    const ref = revision ? `?ref=${encodeURIComponent(revision)}` : "";
    const file = await this.client.request<{ content?: string; encoding?: string }>(
      `/repos/${repository.name}/contents/${path}${ref}`,
      token,
    );
    const content =
      file.encoding === "base64" && file.content
        ? new TextDecoder().decode(
            Uint8Array.from(atob(file.content.replace(/\n/g, "")), (char) => char.charCodeAt(0)),
          )
        : (file.content ?? "");
    return { path, content };
  }

  async listTree(
    connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<string[]> {
    const token = await this.client.installationToken(connection.installationId);
    const branch = encodeURIComponent(repository.defaultBranch);
    try {
      const body = await this.client.request<{ tree?: { path?: string; type?: string }[] }>(
        `/repos/${repository.name}/git/trees/${branch}?recursive=1`,
        token,
      );
      return (body.tree ?? [])
        .flatMap((item) => (item.type === "blob" && item.path ? [item.path] : []))
        .slice(0, 10_000);
    } catch (error) {
      if (error instanceof Error && error.message.includes("returned 409")) return [];
      throw error;
    }
  }

  async openPullRequest(input: {
    connection: ProviderConnection;
    repository: ProviderRepository;
    branch: string;
    path: string;
    content: string;
    commitMessage: string;
    prTitle: string;
    prBody: string;
  }): Promise<{ url: string }> {
    const token = await this.client.installationToken(input.connection.installationId);
    const base = await this.client.request<{ sha: string }>(
      `/repos/${input.repository.name}/commits/${encodeURIComponent(input.repository.defaultBranch)}`,
      token,
    );
    try {
      await this.client.request(`/repos/${input.repository.name}/git/refs`, token, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: base.sha }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("returned 422")) throw error;
    }
    const existingSha = await this.fileSha(token, input.repository.name, input.path, input.branch);
    const payload: { message: string; content: string; branch: string; sha?: string } = {
      message: input.commitMessage,
      content: encodeBase64(input.content),
      branch: input.branch,
    };
    if (existingSha) payload.sha = existingSha;
    await this.client.request(`/repos/${input.repository.name}/contents/${input.path}`, token, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const owner = input.repository.name.split("/")[0] ?? "";
    try {
      const pull = await this.client.request<{ html_url?: string }>(
        `/repos/${input.repository.name}/pulls`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            title: input.prTitle,
            head: input.branch,
            base: input.repository.defaultBranch,
            body: input.prBody,
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!pull.html_url) throw new Error("GitHub pull request did not return a url");
      return { url: pull.html_url };
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("returned 422")) throw error;
      const head = encodeURIComponent(`${owner}:${input.branch}`);
      const pulls = await this.client.request<{ html_url?: string }[]>(
        `/repos/${input.repository.name}/pulls?head=${head}&state=open`,
        token,
      );
      const url = pulls[0]?.html_url;
      if (!url) throw error;
      return { url };
    }
  }

  private async fileSha(
    token: string,
    name: string,
    path: string,
    branch: string,
  ): Promise<string | null> {
    try {
      const file = await this.client.request<{ sha?: string }>(
        `/repos/${name}/contents/${path}?ref=${encodeURIComponent(branch)}`,
        token,
      );
      return file.sha ?? null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("returned 404")) return null;
      throw error;
    }
  }

  async searchRepository(
    connection: ProviderConnection,
    repository: ProviderRepository,
    query: string,
  ): Promise<SearchResult[]> {
    const token = await this.client.installationToken(connection.installationId);
    const result = await this.client.request<{
      items?: { path: string; text_matches?: { fragment?: string }[] }[];
    }>(`/search/code?q=${encodeURIComponent(`${query} repo:${repository.name}`)}`, token);
    return (result.items ?? []).map((item) => ({
      path: item.path,
      text: item.text_matches?.[0]?.fragment ?? "",
    }));
  }
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type { GitHubAppConfig };
