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

const DRIVE = "https://www.googleapis.com/drive/v3";
const MAX_FILE_BYTES = 200_000;
const MAX_PAGES = 5;

export class GoogleProvider implements SourceProvider {
  readonly name = "google";

  constructor(private readonly config: { accessToken: string; fetch?: typeof fetch }) {}

  async account(): Promise<{ id: string; email: string }> {
    const body = await this.getJson<{ id?: string; email?: string }>(
      "https://www.googleapis.com/oauth2/v2/userinfo",
    );
    if (!body.id) throw new Error("Google account has no id");
    return { id: body.id, email: body.email ?? body.id };
  }

  async discoverRepositories(_connection: ProviderConnection): Promise<DiscoveredRepository[]> {
    const found: DiscoveredRepository[] = [];
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google.colaboratory' and 'me' in owners and trashed=false",
        fields: "nextPageToken,files(id,name,webViewLink)",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const body = await this.getJson<{
        files?: { id?: string; name?: string; webViewLink?: string }[];
        nextPageToken?: string;
      }>(`${DRIVE}/files?${params}`);
      for (const file of body.files ?? []) {
        if (!file.id) continue;
        found.push({
          externalId: `drive/${file.id}`,
          name: file.name?.trim() || "notebook",
          url: notebookUrl(file.id, file.webViewLink),
          defaultBranch: "main",
        });
      }
      pageToken = body.nextPageToken ?? "";
      if (!pageToken) break;
    }
    return found;
  }

  async getLatestRevision(
    _connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<Revision> {
    const id = fileId(repository.externalId);
    const body = await this.getJson<{ headRevisionId?: string; modifiedTime?: string }>(
      `${DRIVE}/files/${encodeURIComponent(id)}?fields=headRevisionId,modifiedTime`,
    );
    const sha = body.headRevisionId || body.modifiedTime;
    if (!sha) throw new Error("Google notebook has no revision");
    return { sha, branch: repository.defaultBranch };
  }

  async getChanges(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    _fromRevision: string,
    _toRevision: string,
  ): Promise<RepositoryChange[]> {
    return [{ path: notebookPath(repository.name), status: "modified" }];
  }

  async getFile(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    path: string,
    _revision?: string,
  ): Promise<FileContent> {
    const expected = notebookPath(repository.name);
    if (path !== expected) throw new Error("Google file returned 404");
    const id = fileId(repository.externalId);
    const response = await this.fetch(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`);
    if (!response.ok) throw new Error(`Google file returned ${response.status}`);
    return { path, content: await readLimited(response, MAX_FILE_BYTES) };
  }

  async searchRepository(
    _connection: ProviderConnection,
    repository: ProviderRepository,
    query: string,
  ): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    const path = notebookPath(repository.name);
    if (!needle || !path.toLowerCase().includes(needle)) return [];
    return [{ path, text: path }];
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await this.fetch(url);
    if (!response.ok) throw new Error(`Google ${pathOf(url)} returned ${response.status}`);
    return (await response.json()) as T;
  }

  private fetch(url: string): Promise<Response> {
    return (this.config.fetch ?? fetch)(url, {
      headers: { Authorization: `Bearer ${this.config.accessToken}`, "User-Agent": "exokortex" },
    });
  }
}

export async function googleAuthorization(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  fetch?: typeof fetch;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const tokens = await tokenRequest(input.fetch, {
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });
  if (!tokens.refresh_token) throw new Error("Google token returned 401");
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

export async function googleAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetch?: typeof fetch;
}): Promise<string> {
  const tokens = await tokenRequest(input.fetch, {
    client_id: input.clientId,
    client_secret: input.clientSecret,
    refresh_token: input.refreshToken,
    grant_type: "refresh_token",
  });
  return tokens.access_token;
}

async function tokenRequest(
  fetchImpl: typeof fetch | undefined,
  fields: Record<string, string>,
): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await (fetchImpl ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": "exokortex" },
    body: new URLSearchParams(fields),
  });
  if (!response.ok) throw new Error(`Google token returned ${response.status}`);
  const body = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (!body.access_token) throw new Error("Google token returned 401");
  return { access_token: body.access_token, refresh_token: body.refresh_token };
}

function fileId(externalId: string): string {
  if (!externalId.startsWith("drive/")) {
    throw new Error("Google repository id is not a Drive file");
  }
  const id = externalId.slice("drive/".length);
  if (!id) throw new Error("Google repository id is not a Drive file");
  return id;
}

function notebookPath(name: string): string {
  const base = name.split("/").pop()?.trim() || "notebook";
  return base.toLowerCase().endsWith(".ipynb") ? base : `${base}.ipynb`;
}

function notebookUrl(id: string, webViewLink?: string): string {
  if (webViewLink?.startsWith("https://")) return webViewLink;
  return `https://colab.research.google.com/drive/${id}`;
}

function pathOf(url: string): string {
  return url.replace(/^https:\/\/[^/]+/, "").split("?")[0] ?? url;
}

async function readLimited(response: Response, max: number): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > max) throw new Error("Google file is too large");
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
      throw new Error("Google file is too large");
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
