import type {
  DiscoveredRepository,
  FileContent,
  ProviderConnection,
  ProviderRepository,
  RepositoryChange,
  Revision,
  SearchResult,
  SourceProvider,
} from "./types.js";

export class NotImplementedProvider implements SourceProvider {
  constructor(readonly name: string) {}

  private fail(): never {
    throw new Error(`${this.name} is not implemented`);
  }

  discoverRepositories(_connection: ProviderConnection): Promise<DiscoveredRepository[]> {
    this.fail();
  }

  getLatestRevision(
    _connection: ProviderConnection,
    _repository: ProviderRepository,
  ): Promise<Revision> {
    this.fail();
  }

  getChanges(
    _connection: ProviderConnection,
    _repository: ProviderRepository,
    _fromRevision: string,
    _toRevision: string,
  ): Promise<RepositoryChange[]> {
    this.fail();
  }

  getFile(
    _connection: ProviderConnection,
    _repository: ProviderRepository,
    _path: string,
    _revision?: string,
  ): Promise<FileContent> {
    this.fail();
  }

  searchRepository(
    _connection: ProviderConnection,
    _repository: ProviderRepository,
    _query: string,
  ): Promise<SearchResult[]> {
    this.fail();
  }
}

export const huggingFaceProvider = new NotImplementedProvider("HuggingFaceProvider");
export const kaggleProvider = new NotImplementedProvider("KaggleProvider");
export const googleProvider = new NotImplementedProvider("GoogleProvider");
