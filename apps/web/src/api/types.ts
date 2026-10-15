export interface Me {
  id: string;
  email: string;
  timezone: string;
  scanFrequency: string;
  nextScanAt: string | null;
}

export interface DashboardSnapshot {
  repositoryCount: number;
  portfolioProjectCount: number;
  pendingApprovals: number;
  lastScan: string | null;
  nextScan: string | null;
}

export interface RepositoryRow {
  id: string;
  name: string;
  url: string;
  defaultBranch: string | null;
  role: string;
  lastRevision: string | null;
}

export interface ConnectionRow {
  id: string;
  provider: string;
  status: string;
}

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  technologies: string[];
  status: string;
}

export interface ApprovalRow {
  id: string;
  action: string;
  status: string;
  reason: string | null;
  createdAt: string;
}

export interface ChangeRow {
  id: string;
  fromRevision: string;
  toRevision: string;
  summary: string | null;
  significance: string | null;
  status: string;
  createdAt: string;
}
