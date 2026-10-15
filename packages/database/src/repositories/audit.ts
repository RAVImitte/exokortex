import { newId, nowIso } from "@exokortex/shared";

export interface AuditInput {
  userId: string;
  workflowId?: string | null;
  jobId?: string | null;
  entityType: string;
  entityId: string;
  fromState: string | null;
  toState: string;
  detail?: string | null;
  now?: string;
}

export class AuditRepository {
  constructor(private readonly db: D1Database) {}

  async write(input: AuditInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_events
         (id, user_id, workflow_id, job_id, entity_type, entity_id, from_state, to_state, detail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId(),
        input.userId,
        input.workflowId ?? null,
        input.jobId ?? null,
        input.entityType,
        input.entityId,
        input.fromState,
        input.toState,
        input.detail ?? null,
        input.now ?? nowIso(),
      )
      .run();
  }

  async list(userId: string, limit = 50): Promise<Record<string, unknown>[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, entity_type, entity_id, from_state, to_state, detail, created_at
         FROM audit_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(userId, limit)
      .all();
    return rows.results;
  }
}
