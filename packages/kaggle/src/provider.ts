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

const ORIGIN = "https://www.kaggle.com";
const MAX_FILE_BYTES = 200_000;
const MAX_PAGES = 5;
const MAX_SEARCH = 20;

export interface KaggleConfig {
  token: string;
  fetch?: typeof fetch;
}

interface ListedDataset {
  ref?: string;
  ownerRef?: string;
  url?: string;
  currentVersionNumber?: number;
}

interface ListedKernel {
  ref?: string;
  author?: string;
  currentVersionNumber?: number;
}

interface DatasetFile {
  name?: string;
  totalBytes?: number;
}

interface KernelBlob {
  source?: string;
  language?: string;
  kernelType?: string;
  slug?: string;
}

export class KaggleProvider implements SourceProvider {
  readonly name = "kaggle";

  constructor(private readonly config: KaggleConfig) {}

  async whoami(): Promise<{ username: string }> {
    const response = await (this.config.fetch ?? fetch)(`${ORIGIN}/api/v1/oauth2/introspect`, {
      method: "POST",
      headers: { "content-type": "application/json", "User-Agent": "exokortex" },
      body: JSON.stringify({ token: this.config.token }),
    });
    if (!response.ok)
      throw new Error(`Kaggle /api/v1/oauth2/introspect returned ${response.status}`);
    const body = (await response.json()) as { active?: boolean; username?: string };
    if (!body.active || !body.username) {
      throw new Error("Kaggle /api/v1/oauth2/introspect returned 401");
    }
    return { username: body.username };
  }

  async discoverRepositories(connection: ProviderConnection): Promise<DiscoveredRepository[]> {
    const username = connection.installationId;
    const found: DiscoveredRepository[] = [];
    const datasets = await this.pages<ListedDataset>(
      "/api/v1/datasets/list",
      { user: username },
      "datasets",
    );
    for (const dataset of datasets) {
      if (!dataset.ref?.includes("/")) continue;
      if (ownerOf(dataset.ref) !== username) continue;
      found.push({
        externalId: `datasets/${dataset.ref}`,
        name: `datasets/${dataset.ref}`,
        url: dataset.url ?? `${ORIGIN}/datasets/${dataset.ref}`,
        defaultBranch: "main",
      });
    }
    const kernels = await this.pages<ListedKernel>(
      "/api/v1/kernels/list",
      { user: username },
      "kernels",
    );
    for (const kernel of kernels) {
      if (!kernel.ref?.includes("/")) continue;
      if ((kernel.author ?? ownerOf(kernel.ref)) !== username) continue;
      found.push({
        externalId: `kernels/${kernel.ref}`,
        name: `kernels/${kernel.ref}`,
        url: `${ORIGIN}/code/${kernel.ref}`,
        defaultBranch: "main",
      });
    }
    return found;
  }

  async getLatestRevision(
    _connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<Revision> {
    const repo = splitRepo(repository.externalId);
    const version =
      repo.kind === "datasets"
        ? await this.datasetVersion(repo.owner, repo.slug)
        : (await this.kernel(repo.owner, repo.slug)).version;
    return { sha: `v${version}`, branch: repository.defaultBranch };
  }

  async getChanges(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    fromRevision: string,
    toRevision: string,
  ): Promise<RepositoryChange[]> {
    const repo = splitRepo(repository.externalId);
    if (repo.kind === "kernels") {
      const kernel = await this.kernel(repo.owner, repo.slug);
      return [{ path: kernel.sourceName, status: "modified" }];
    }
    const before = await this.datasetFiles(repo.owner, repo.slug, versionNumber(fromRevision));
    const after = await this.datasetFiles(repo.owner, repo.slug, versionNumber(toRevision));
    const changes: RepositoryChange[] = [];
    for (const [path, size] of after) {
      const previous = before.get(path);
      if (previous === undefined) changes.push({ path, status: "added" });
      else if (previous !== size) changes.push({ path, status: "modified" });
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
    _revision?: string,
  ): Promise<FileContent> {
    const repo = splitRepo(repository.externalId);
    if (repo.kind === "kernels") {
      const kernel = await this.kernel(repo.owner, repo.slug);
      if (path !== kernel.sourceName) throw new Error("Kaggle file returned 404");
      if (kernel.source.length > MAX_FILE_BYTES) throw new Error("Kaggle file is too large");
      return { path, content: kernel.source };
    }
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const response = await this.fetch(
      `/api/v1/datasets/download/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.slug)}/${encoded}`,
    );
    if (!response.ok) throw new Error(`Kaggle file returned ${response.status}`);
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("zip")) throw new Error("Kaggle file is too large");
    return { path, content: await readLimited(response, MAX_FILE_BYTES) };
  }

  async searchRepository(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    query: string,
  ): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const repo = splitRepo(repository.externalId);
    const names =
      repo.kind === "kernels"
        ? [(await this.kernel(repo.owner, repo.slug)).sourceName]
        : [...(await this.datasetFiles(repo.owner, repo.slug)).keys()];
    const matches: SearchResult[] = [];
    for (const path of names) {
      if (!path.toLowerCase().includes(needle)) continue;
      matches.push({ path, text: path });
      if (matches.length >= MAX_SEARCH) break;
    }
    return matches;
  }

  private async datasetVersion(owner: string, slug: string): Promise<number> {
    const body = await this.getJson<{ currentVersionNumber?: number }>(
      `/api/v1/datasets/view/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
    );
    if (!body.currentVersionNumber) throw new Error("Kaggle dataset has no version");
    return body.currentVersionNumber;
  }

  private async datasetFiles(
    owner: string,
    slug: string,
    version?: number,
  ): Promise<Map<string, number>> {
    const files = new Map<string, number>();
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const params = new URLSearchParams({ pageSize: "200" });
      if (version) params.set("datasetVersionNumber", String(version));
      if (pageToken) params.set("pageToken", pageToken);
      const body = await this.getJson<{
        datasetFiles?: DatasetFile[];
        nextPageToken?: string;
      }>(
        `/api/v1/datasets/list/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}?${params}`,
      );
      for (const file of body.datasetFiles ?? []) {
        if (file.name) files.set(file.name, file.totalBytes ?? 0);
      }
      pageToken = body.nextPageToken ?? "";
      if (!pageToken) break;
    }
    return files;
  }

  private async kernel(
    owner: string,
    slug: string,
  ): Promise<{ version: number; sourceName: string; source: string }> {
    const params = new URLSearchParams({ userName: owner, kernelSlug: slug });
    const body = await this.getJson<{
      metadata?: { currentVersionNumber?: number };
      blob?: KernelBlob;
    }>(`/api/v1/kernels/pull?${params}`);
    const version = body.metadata?.currentVersionNumber;
    if (!version) throw new Error("Kaggle notebook has no version");
    const blob = body.blob ?? {};
    return { version, sourceName: sourceName(slug, blob), source: blob.source ?? "" };
  }

  private async pages<T extends { ref?: string }>(
    path: string,
    query: Record<string, string>,
    key: "datasets" | "kernels",
  ): Promise<T[]> {
    const found: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const params = new URLSearchParams({ ...query, page: String(page), pageSize: "100" });
      const body = await this.getJson<T[] | Record<string, T[]>>(`${path}?${params}`);
      const batch = Array.isArray(body) ? body : (body[key] ?? []);
      found.push(...batch);
      if (batch.length < 20) break;
    }
    return found;
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.fetch(path);
    if (!response.ok) throw new Error(`Kaggle ${path.split("?")[0]} returned ${response.status}`);
    return (await response.json()) as T;
  }

  private fetch(path: string): Promise<Response> {
    return (this.config.fetch ?? fetch)(`${ORIGIN}${path}`, {
      headers: { Authorization: `Bearer ${this.config.token}`, "User-Agent": "exokortex" },
    });
  }
}

function ownerOf(ref: string): string {
  return ref.slice(0, ref.indexOf("/"));
}

function splitRepo(externalId: string): {
  kind: "datasets" | "kernels";
  owner: string;
  slug: string;
} {
  const [kind, owner, ...rest] = externalId.split("/");
  const slug = rest.join("/");
  if ((kind !== "datasets" && kind !== "kernels") || !owner || !slug) {
    throw new Error("Kaggle repository id is not a dataset or notebook");
  }
  return { kind, owner, slug };
}

function versionNumber(revision: string): number {
  const match = /^v(\d+)$/.exec(revision);
  if (!match?.[1]) throw new Error("Kaggle revision is not a version");
  return Number(match[1]);
}

function sourceName(slug: string, blob: KernelBlob): string {
  if (blob.kernelType === "script") return blob.language === "r" ? `${slug}.R` : `${slug}.py`;
  return `${slug}.ipynb`;
}

async function readLimited(response: Response, max: number): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > max) throw new Error("Kaggle file is too large");
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
      throw new Error("Kaggle file is too large");
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
