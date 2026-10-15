import {
  compareRevisions,
  isExcludedFromDiscovery,
  normalizeRepoUrl,
  type KnownPortfolio,
  type RepositoryRole,
} from "@exokortex/core";
import type { Database, RepositoryRecord } from "@exokortex/database";
import type { SourceProvider } from "@exokortex/source-providers";

export interface ScanSummary {
  baselined: number;
  unchanged: number;
  changed: number;
  skipped: number;
}

export interface ScanRepo {
  id: string;
  name: string;
  url: string;
  role: RepositoryRole;
  defaultBranch: string | null;
  lastRevision: string | null;
  externalId: string;
}

export async function scanRepositories(input: {
  repos: ScanRepo[];
  known: KnownPortfolio;
  getLatestRevision: (repo: ScanRepo) => Promise<string>;
  markScanned: (id: string, revision: string) => Promise<void>;
  insertChange: (id: string, from: string, to: string) => Promise<"created" | "exists">;
}): Promise<ScanSummary> {
  const summary: ScanSummary = { baselined: 0, unchanged: 0, changed: 0, skipped: 0 };
  for (const repo of input.repos) {
    if (isExcludedFromDiscovery(repo, input.known)) {
      summary.skipped += 1;
      continue;
    }
    const latest = await input.getLatestRevision(repo);
    const comparison = compareRevisions(repo.lastRevision, latest);
    if (comparison === "baseline") {
      await input.markScanned(repo.id, latest);
      summary.baselined += 1;
      continue;
    }
    if (comparison === "unchanged") {
      await input.markScanned(repo.id, latest);
      summary.unchanged += 1;
      continue;
    }
    const outcome = await input.insertChange(repo.id, repo.lastRevision ?? "", latest);
    await input.markScanned(repo.id, latest);
    if (outcome === "created") summary.changed += 1;
    else summary.unchanged += 1;
  }
  return summary;
}

function knownPortfolio(repos: RepositoryRecord[]): KnownPortfolio {
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const repo of repos) {
    if (repo.role !== "PORTFOLIO") continue;
    ids.add(repo.id);
    urls.add(normalizeRepoUrl(repo.url));
  }
  return { ids, urls };
}

export async function runUserScan(input: {
  db: Database;
  provider: SourceProvider;
  userId: string;
  installationId: string;
  repositoryId?: string;
  now: string;
}): Promise<ScanSummary> {
  const all = await input.db.repos.list(input.userId);
  const selected = input.repositoryId ? all.filter((repo) => repo.id === input.repositoryId) : all;
  return scanRepositories({
    repos: selected,
    known: knownPortfolio(all),
    getLatestRevision: async (repo) => {
      const revision = await input.provider.getLatestRevision(
        { installationId: input.installationId },
        {
          externalId: repo.externalId,
          name: repo.name,
          defaultBranch: repo.defaultBranch ?? "main",
        },
      );
      return revision.sha;
    },
    markScanned: (id, revision) =>
      input.db.repos.markScanned(input.userId, id, revision, input.now),
    insertChange: (id, from, to) =>
      input.db.changes.insert({
        userId: input.userId,
        repositoryId: id,
        fromRevision: from,
        toRevision: to,
        now: input.now,
      }),
  });
}
