import type { RepositoryRole, ScanFrequency, WorkflowState } from "@exokortex/core";

export interface UserRecord {
  id: string;
  authSubject: string;
  email: string;
  timezone: string;
  status: string;
  scanFrequency: ScanFrequency;
  nextScanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryRecord {
  id: string;
  userId: string;
  connectionId: string;
  externalId: string;
  name: string;
  url: string;
  defaultBranch: string | null;
  role: RepositoryRole;
  lastRevision: string | null;
  lastScannedAt: string | null;
  excluded: boolean;
}

export interface ConnectionRecord {
  id: string;
  userId: string;
  provider: string;
  externalUserId: string | null;
  externalInstallationId: string | null;
  status: string;
}

export interface ChangeEventRecord {
  id: string;
  userId: string;
  repositoryId: string;
  fromRevision: string;
  toRevision: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface JobRecord {
  id: string;
  userId: string;
  workflowId: string | null;
  type: string;
  payloadJson: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  nextRunAt: string | null;
  lockedAt: string | null;
  lastError: string | null;
}

export interface WorkflowRecord {
  id: string;
  userId: string;
  state: WorkflowState;
}

export interface LlmConfigRecord {
  id: string;
  userId: string;
  provider: string;
  baseUrl: string;
  model: string;
  keyVersion: number;
  updatedAt: string;
}
