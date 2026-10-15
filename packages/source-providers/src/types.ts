export interface ProviderConnection {
  installationId: string;
}

export interface ProviderRepository {
  externalId: string;
  name: string;
  defaultBranch: string;
}

export interface DiscoveredRepository {
  externalId: string;
  name: string;
  url: string;
  defaultBranch: string;
}

export interface Revision {
  sha: string;
  branch: string;
}

export interface RepositoryChange {
  path: string;
  status: string;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface SearchResult {
  path: string;
  text: string;
}

export interface SourceProvider {
  readonly name: string;
  discoverRepositories(connection: ProviderConnection): Promise<DiscoveredRepository[]>;
  getLatestRevision(
    connection: ProviderConnection,
    repository: ProviderRepository,
  ): Promise<Revision>;
  getChanges(
    connection: ProviderConnection,
    repository: ProviderRepository,
    fromRevision: string,
    toRevision: string,
  ): Promise<RepositoryChange[]>;
  getFile(
    connection: ProviderConnection,
    repository: ProviderRepository,
    path: string,
    revision?: string,
  ): Promise<FileContent>;
  searchRepository(
    connection: ProviderConnection,
    repository: ProviderRepository,
    query: string,
  ): Promise<SearchResult[]>;
}
