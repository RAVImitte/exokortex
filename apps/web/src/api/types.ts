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

export interface ChangeRow {
  id: string;
  fromRevision: string;
  toRevision: string;
  createdAt: string;
}
