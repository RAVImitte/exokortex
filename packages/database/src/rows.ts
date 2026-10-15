import type { RepositoryRole, ScanFrequency, WorkflowState } from "@exokortex/core";
import type {
  ChangeEventRecord,
  ConnectionRecord,
  JobRecord,
  RepositoryRecord,
  UserRecord,
  WorkflowRecord,
} from "./types.js";

export interface UserRow {
  id: string;
  auth_subject: string;
  email: string;
  timezone: string;
  status: string;
  scan_frequency: string;
  next_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryRow {
  id: string;
  user_id: string;
  connection_id: string;
  external_id: string;
  name: string;
  url: string;
  default_branch: string | null;
  role: string;
  last_revision: string | null;
  last_scanned_at: string | null;
  excluded: number;
}

export interface ConnectionRow {
  id: string;
  user_id: string;
  provider: string;
  external_user_id: string | null;
  external_installation_id: string | null;
  status: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  workflow_id: string | null;
  type: string;
  payload_json: string;
  status: string;
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  next_run_at: string | null;
  locked_at: string | null;
  last_error: string | null;
}

export interface WorkflowRow {
  id: string;
  user_id: string;
  state: string;
}

export interface ChangeEventRow {
  id: string;
  user_id: string;
  repository_id: string;
  from_revision: string;
  to_revision: string;
  type: string;
  status: string;
  summary: string | null;
  significance: string | null;
  created_at: string;
}

export function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    authSubject: row.auth_subject,
    email: row.email,
    timezone: row.timezone,
    status: row.status,
    scanFrequency: row.scan_frequency as ScanFrequency,
    nextScanAt: row.next_scan_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRepository(row: RepositoryRow): RepositoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    connectionId: row.connection_id,
    externalId: row.external_id,
    name: row.name,
    url: row.url,
    defaultBranch: row.default_branch,
    role: row.role as RepositoryRole,
    lastRevision: row.last_revision,
    lastScannedAt: row.last_scanned_at,
    excluded: row.excluded === 1,
  };
}

export function toConnection(row: ConnectionRow): ConnectionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    externalUserId: row.external_user_id,
    externalInstallationId: row.external_installation_id,
    status: row.status,
  };
}

export function toJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workflowId: row.workflow_id,
    type: row.type,
    payloadJson: row.payload_json,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    idempotencyKey: row.idempotency_key,
    nextRunAt: row.next_run_at,
    lockedAt: row.locked_at,
    lastError: row.last_error,
  };
}

export function toWorkflow(row: WorkflowRow): WorkflowRecord {
  return { id: row.id, userId: row.user_id, state: row.state as WorkflowState };
}

export function toChangeEvent(row: ChangeEventRow): ChangeEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    repositoryId: row.repository_id,
    fromRevision: row.from_revision,
    toRevision: row.to_revision,
    type: row.type,
    status: row.status,
    summary: row.summary,
    significance: row.significance,
    createdAt: row.created_at,
  };
}
