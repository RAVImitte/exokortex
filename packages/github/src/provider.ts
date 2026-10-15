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

export type { GitHubAppConfig };
