import type { RepositoryRole } from "./roles.js";

export function normalizeRepoUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

export interface ExclusionTarget {
  id: string;
  url: string;
  role: RepositoryRole;
}

export interface KnownPortfolio {
  ids: ReadonlySet<string>;
  urls: ReadonlySet<string>;
}

export function isExcludedFromDiscovery(repo: ExclusionTarget, known: KnownPortfolio): boolean {
  if (repo.role === "PORTFOLIO" || repo.role === "EXCLUDED") return true;
  if (known.ids.has(repo.id)) return true;
  return known.urls.has(normalizeRepoUrl(repo.url));
}

const PORTFOLIO_NAME = /(^|[/_.-])(portfolio|personal-site|homepage)([/_.-]|$)/i;

export function suggestsPortfolio(name: string): boolean {
  return PORTFOLIO_NAME.test(name);
}
