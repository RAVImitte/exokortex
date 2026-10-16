import { newId, nowIso } from "@exokortex/shared";

export interface ApprovalRow {
  id: string;
  user_id: string;
  project_id: string | null;
  change_event_id: string | null;
  workflow_id: string | null;
  action: string;
  status: string;
  reason: string | null;
  pull_request_url: string | null;
  created_at: string;
}

export interface ApprovalRecord {
  id: string;
  userId: string;
  projectId: string | null;
  changeEventId: string | null;
  workflowId: string | null;
  action: string;
  status: string;
  reason: string | null;
  pullRequestUrl: string | null;
  createdAt: string;
}

function toApproval(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    changeEventId: row.change_event_id,
    workflowId: row.workflow_id,
    action: row.action,
    status: row.status,
    reason: row.reason,
    pullRequestUrl: row.pull_request_url,
    createdAt: row.created_at,
  };
}

export class ApprovalRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    userId: string;
    projectId: string | null;
    changeEventId: string;
    workflowId: string | null;
    action: string;
    reason: string;
    now?: string;
  }): Promise<ApprovalRecord> {
    const now = input.now ?? nowIso();
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO approvals
         (id, user_id, project_id, change_event_id, workflow_id, action, status, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(
        id,
        input.userId,
        input.projectId,
        input.changeEventId,
        input.workflowId,
        input.action,
        input.reason,
        now,
      )
      .run();
    return {
      id,
      userId: input.userId,
      projectId: input.projectId,
      changeEventId: input.changeEventId,
      workflowId: input.workflowId,
      action: input.action,
      status: "pending",
      reason: input.reason,
      pullRequestUrl: null,
      createdAt: now,
    };
  }

  async findByChange(userId: string, changeEventId: string): Promise<ApprovalRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM approvals
         WHERE user_id = ? AND change_event_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(userId, changeEventId)
      .first<ApprovalRow>();
    return row ? toApproval(row) : null;
  }

  async get(userId: string, approvalId: string): Promise<ApprovalRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM approvals WHERE id = ? AND user_id = ?")
      .bind(approvalId, userId)
      .first<ApprovalRow>();
    return row ? toApproval(row) : null;
  }

  async list(userId: string): Promise<ApprovalRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM approvals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
      .bind(userId)
      .all<ApprovalRow>();
    return rows.results.map(toApproval);
  }

  async listApprovedWithoutPullRequest(
    userId: string,
    workflowId: string,
  ): Promise<ApprovalRecord[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM approvals
         WHERE user_id = ? AND workflow_id = ? AND status = 'approved' AND pull_request_url IS NULL
         ORDER BY created_at`,
      )
      .bind(userId, workflowId)
      .all<ApprovalRow>();
    return rows.results.map(toApproval);
  }

  async setPullRequestUrl(userId: string, approvalId: string, url: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE approvals SET pull_request_url = ?
         WHERE id = ? AND user_id = ? AND pull_request_url IS NULL`,
      )
      .bind(url, approvalId, userId)
      .run();
  }

  async listPending(userId: string, workflowId: string): Promise<ApprovalRecord[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM approvals
         WHERE user_id = ? AND workflow_id = ? AND status = 'pending'
         ORDER BY created_at`,
      )
      .bind(userId, workflowId)
      .all<ApprovalRow>();
    return rows.results.map(toApproval);
  }

  async resolve(
    userId: string,
    approvalId: string,
    status: "approved" | "rejected",
    projectId: string | null,
    now = nowIso(),
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE approvals
         SET status = ?, project_id = COALESCE(?, project_id), resolved_at = ?
         WHERE id = ? AND user_id = ? AND status = 'pending'`,
      )
      .bind(status, projectId, now, approvalId, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}
