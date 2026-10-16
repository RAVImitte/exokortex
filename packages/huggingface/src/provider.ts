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

const ORIGIN = "https://huggingface.co";
const KINDS = ["models", "datasets", "spaces"] as const;
type Kind = (typeof KINDS)[number];
const MAX_FILE_BYTES = 200_000;
const MAX_SEARCH = 20;
const MAX_PAGES = 5;

export interface HuggingFaceConfig {
  token: string;
  fetch?: typeof fetch;
}

interface ListedRepo {
  id?: string;
}

interface TreeItem {
  type?: string;
  oid?: string;
  path?: string;
}

export class HuggingFaceProvider implements SourceProvider {
  readonly name = "huggingface";

  constructor(private readonly config: HuggingFaceConfig) {}

  async whoami(): Promise<{ username: string }> {
    const body = await this.getJson<{ name?: string }>("/api/whoami-v2");
    if (!body.name) throw new Error("Hugging Face account has no username");
    return { username: body.name };
  }

  async discoverRepositories(connection: ProviderConnection): Promise<DiscoveredRepository[]> {
    const author = connection.installationId;
    const found: DiscoveredRepository[] = [];
    for (const kind of KINDS) {
      const listed = await this.listAll(
        `/api/${kind}?author=${encodeURIComponent(author)}&limit=100`,
      );
      for (const repo of listed) {
        if (!repo.id?.includes("/")) continue;
        found.push({
          externalId: `${kind}/${repo.id}`,
          name: kind === "models" ? repo.id : `${kind}/${repo.id}`,
          url: publicUrl(kind, repo.id),
          defaultBranch: "main",
        });
      }
    }
    return found;
  }

  async getLatestRevision(
    _connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<Revision> {
    const { kind, id } = splitRepo(repository.externalId);
    const body = await this.getJson<{ sha?: string }>(`/api/${repoPath(kind, id)}`);
    if (!body.sha) throw new Error("Hugging Face repository has no commit");
    return { sha: body.sha, branch: repository.defaultBranch };
  }

  async getChanges(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    fromRevision: string,
    toRevision: string,
  ): Promise<RepositoryChange[]> {
    const { kind, id } = splitRepo(repository.externalId);
    const before = await this.tree(kind, id, fromRevision);
    const after = await this.tree(kind, id, toRevision);
    const changes: RepositoryChange[] = [];
    for (const [path, oid] of after) {
      const previous = before.get(path);
      if (!previous) changes.push({ path, status: "added" });
      else if (previous !== oid) changes.push({ path, status: "modified" });
    }
    for (const path of before.keys()) {
      if (!after.has(path)) changes.push({ path, status: "removed" });
    }
    return changes.sort((left, right) => left.path.localeCompare(right.path));
  }

  async getFile(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    path: string,
    revision?: string,
  ): Promise<FileContent> {
    const { kind, id } = splitRepo(repository.externalId);
    const ref = revision ?? repository.defaultBranch;
    const url = resolveUrl(kind, id, ref, path);
    const response = await this.fetch(url);
    if (!response.ok) throw new Error(`Hugging Face file returned ${response.status}`);
    return { path, content: await readLimited(response, MAX_FILE_BYTES) };
  }

  async searchRepository(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    query: string,
  ): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const { kind, id } = splitRepo(repository.externalId);
    const files = await this.tree(kind, id, repository.defaultBranch);
    const matches: SearchResult[] = [];
    for (const filePath of files.keys()) {
      if (!filePath.toLowerCase().includes(needle)) continue;
      matches.push({ path: filePath, text: filePath });
      if (matches.length >= MAX_SEARCH) break;
    }
    return matches;
  }

  private async tree(kind: Kind, id: string, revision: string): Promise<Map<string, string>> {
    const body = await this.getJson<TreeItem[]>(
      `/api/${repoPath(kind, id)}/tree/${encodeURIComponent(revision)}?recursive=1`,
    );
    const files = new Map<string, string>();
    for (const item of body) {
      if (item.type === "file" && item.path && item.oid) files.set(item.path, item.oid);
    }
    return files;
  }

  private async listAll(path: string): Promise<ListedRepo[]> {
    const found: ListedRepo[] = [];
    let next: string | null = path;
    for (let page = 0; page < MAX_PAGES && next; page += 1) {
      const response = await this.fetch(next.startsWith("http") ? next : `${ORIGIN}${next}`);
      if (!response.ok) throw new Error(`Hugging Face ${path} returned ${response.status}`);
      const batch = (await response.json()) as ListedRepo[];
      found.push(...batch);
      next = linkNext(response.headers.get("link"));
      if (batch.length < 100) break;
    }
    return found;
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.fetch(`${ORIGIN}${path}`);
    if (!response.ok) throw new Error(`Hugging Face ${path} returned ${response.status}`);
    return (await response.json()) as T;
  }

  private fetch(url: string): Promise<Response> {
    return (this.config.fetch ?? fetch)(url, {
      headers: { Authorization: `Bearer ${this.config.token}`, "User-Agent": "exokortex" },
    });
  }
}

function splitRepo(externalId: string): { kind: Kind; id: string } {
  const slash = externalId.indexOf("/");
  const kind = externalId.slice(0, slash);
  const id = externalId.slice(slash + 1);
  if (!isKind(kind) || !id.includes("/")) {
    throw new Error("Hugging Face repository id is not a model, dataset, or space");
  }
  return { kind, id };
}

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

function repoPath(kind: Kind, id: string): string {
  return `${kind}/${id.split("/").map(encodeURIComponent).join("/")}`;
}

function publicUrl(kind: Kind, id: string): string {
  if (kind === "datasets") return `${ORIGIN}/datasets/${id}`;
  if (kind === "spaces") return `${ORIGIN}/spaces/${id}`;
  return `${ORIGIN}/${id}`;
}

function resolveUrl(kind: Kind, id: string, revision: string, filePath: string): string {
  const prefix = kind === "datasets" ? "datasets/" : kind === "spaces" ? "spaces/" : "";
  const repo = id.split("/").map(encodeURIComponent).join("/");
  const file = filePath.split("/").map(encodeURIComponent).join("/");
  return `${ORIGIN}/${prefix}${repo}/resolve/${encodeURIComponent(revision)}/${file}`;
}

function linkNext(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function readLimited(response: Response, max: number): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > max) {
    throw new Error("Hugging Face file is too large");
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total <= max) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error("Hugging Face file is too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}
