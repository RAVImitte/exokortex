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

  async listInstallationIds(): Promise<string[]> {
    const rows = await this.client.appInstallations();
    return rows.map((row) => String(row.id));
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
        ? decodeGitHubBase64(file.content)
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

  async createRepository(input: {
    connection: ProviderConnection;
    name: string;
    description: string;
  }): Promise<ProviderRepository & { url: string }> {
    const installation = await this.client.appInstallation(input.connection.installationId);
    const login = installation.account?.login;
    const type = installation.account?.type;
    if (!login || (type !== "User" && type !== "Organization")) {
      throw new Error("GitHub installation has no account");
    }
    const token = await this.client.installationToken(input.connection.installationId);
    const path = type === "Organization" ? `/orgs/${login}/repos` : "/user/repos";
    const names = [
      input.name,
      "exokortex-portfolio",
      "exokortex-portfolio-2",
      "exokortex-portfolio-3",
    ];
    for (const name of names) {
      try {
        const repo = await this.client.request<{
          id: number;
          full_name: string;
          html_url: string;
          default_branch: string | null;
        }>(path, token, {
          method: "POST",
          body: JSON.stringify({
            name,
            description: input.description,
            private: false,
            auto_init: false,
          }),
          headers: { "Content-Type": "application/json" },
        });
        return {
          externalId: String(repo.id),
          name: repo.full_name,
          url: repo.html_url,
          defaultBranch: repo.default_branch ?? "main",
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("returned 422")) continue;
        throw error;
      }
    }
    throw new Error("GitHub repository name is already taken");
  }

  async publishFiles(input: {
    connection: ProviderConnection;
    repository: ProviderRepository;
    branch: string;
    files: { path: string; content: string }[];
    commitMessage: string;
    prTitle: string;
    prBody: string;
  }): Promise<{ url: string; pullRequest: boolean }> {
    if (input.files.length === 0) throw new Error("No portfolio files to publish");
    const token = await this.client.installationToken(input.connection.installationId);
    const name = input.repository.name;
    let head = await this.branchHead(token, name, input.repository.defaultBranch);
    const empty = !head;
    if (!head) {
      const first = input.files[0];
      if (!first) throw new Error("No portfolio files to publish");
      await this.writeFirstFile(token, name, first, input.commitMessage);
      head = await this.branchHead(token, name, input.repository.defaultBranch);
      if (!head) throw new Error("GitHub repository has no default branch");
    }
    const tree = await this.client.request<{ sha: string }>(`/repos/${name}/git/trees`, token, {
      method: "POST",
      body: JSON.stringify({
        base_tree: head.treeSha,
        tree: input.files.map((file) => ({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content,
        })),
      }),
      headers: { "Content-Type": "application/json" },
    });
    const commit = await this.client.request<{ sha: string }>(`/repos/${name}/git/commits`, token, {
      method: "POST",
      body: JSON.stringify({
        message: input.commitMessage,
        tree: tree.sha,
        parents: [head.commitSha],
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (empty) {
      await this.pointBranch(token, name, input.repository.defaultBranch, commit.sha);
      return { url: `https://github.com/${name}`, pullRequest: false };
    }
    await this.pointBranch(token, name, input.branch, commit.sha);
    const url = await this.openOrFindPull(token, input);
    return { url, pullRequest: true };
  }

  private async writeFirstFile(
    token: string,
    name: string,
    file: { path: string; content: string },
    message: string,
  ): Promise<void> {
    const path = file.path.split("/").map(encodeURIComponent).join("/");
    await this.client.request(`/repos/${name}/contents/${path}`, token, {
      method: "PUT",
      body: JSON.stringify({ message, content: encodeBase64(file.content) }),
      headers: { "Content-Type": "application/json" },
    });
  }

  private async branchHead(
    token: string,
    name: string,
    branch: string,
  ): Promise<{ commitSha: string; treeSha: string } | null> {
    try {
      const commit = await this.client.request<{
        sha: string;
        commit?: { tree?: { sha?: string } };
      }>(`/repos/${name}/commits/${encodeURIComponent(branch)}`, token);
      const treeSha = commit.commit?.tree?.sha;
      if (!treeSha) return null;
      return { commitSha: commit.sha, treeSha };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("returned 404") || error.message.includes("returned 409"))
      ) {
        return null;
      }
      throw error;
    }
  }

  private async pointBranch(
    token: string,
    name: string,
    branch: string,
    sha: string,
  ): Promise<void> {
    try {
      await this.client.request(`/repos/${name}/git/refs`, token, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("returned 422")) throw error;
      await this.client.request(
        `/repos/${name}/git/refs/heads/${encodeURIComponent(branch)}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ sha, force: true }),
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  private async openOrFindPull(
    token: string,
    input: {
      repository: ProviderRepository;
      branch: string;
      prTitle: string;
      prBody: string;
    },
  ): Promise<string> {
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
      return pull.html_url;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("returned 422")) throw error;
      const head = encodeURIComponent(`${owner}:${input.branch}`);
      const pulls = await this.client.request<{ html_url?: string }[]>(
        `/repos/${input.repository.name}/pulls?head=${head}&state=open`,
        token,
      );
      const url = pulls[0]?.html_url;
      if (!url) throw error;
      return url;
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

function decodeGitHubBase64(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9+/]/g, "");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type { GitHubAppConfig };
