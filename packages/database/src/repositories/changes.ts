import { newId, nowIso } from "@exokortex/shared";
import { toChangeEvent, type ChangeEventRow } from "../rows.js";
import type { ChangeEventRecord } from "../types.js";

export class ChangeEventRepository {
  constructor(private readonly db: D1Database) {}

  async insert(input: {
    userId: string;
    repositoryId: string;
    fromRevision: string;
    toRevision: string;
    now?: string;
  }): Promise<"created" | "exists"> {
    const now = input.now ?? nowIso();
    const result = await this.db
      .prepare(
        `INSERT INTO change_events
         (id, user_id, repository_id, from_revision, to_revision, type, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'revision', 'open', ?)
         ON CONFLICT (repository_id, from_revision, to_revision) DO NOTHING`,
      )
      .bind(newId(), input.userId, input.repositoryId, input.fromRevision, input.toRevision, now)
      .run();
    return (result.meta.changes ?? 0) > 0 ? "created" : "exists";
  }

  async get(userId: string, changeId: string): Promise<ChangeEventRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM change_events WHERE id = ? AND user_id = ?")
      .bind(changeId, userId)
      .first<ChangeEventRow>();
    return row ? toChangeEvent(row) : null;
  }

  async reopen(userId: string, changeId: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE change_events
         SET status = 'open', processed_at = NULL
         WHERE id = ? AND user_id = ? AND status = 'ignored'`,
      )
      .bind(changeId, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listOpen(
    userId: string,
    repositoryId?: string,
    connectionId?: string,
  ): Promise<ChangeEventRecord[]> {
    const statement = this.db
      .prepare(
        `SELECT c.* FROM change_events c JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = ? AND r.user_id = ? AND c.status = 'open'
       AND (? IS NULL OR c.repository_id = ?) AND (? IS NULL OR r.connection_id = ?)
       AND r.role = 'SOURCE' AND r.excluded = 0
       ORDER BY c.created_at`,
      )
      .bind(
        userId,
        userId,
        repositoryId ?? null,
        repositoryId ?? null,
        connectionId ?? null,
        connectionId ?? null,
      );
    const rows = await statement.all<ChangeEventRow>();
    return rows.results.map(toChangeEvent);
  }

  async mark(
    userId: string,
    changeId: string,
    input: { summary: string; significance: string; status: "analyzed" | "ignored"; now?: string },
  ): Promise<void> {
    const now = input.now ?? nowIso();
    await this.db
      .prepare(
        `UPDATE change_events
         SET summary = ?, significance = ?, status = ?, processed_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(input.summary, input.significance, input.status, now, changeId, userId)
      .run();
  }

  async listReadyForCurator(
    userId: string,
    repositoryId?: string,
    connectionId?: string,
  ): Promise<ChangeEventRecord[]> {
    const statement = this.db
      .prepare(
        `SELECT c.* FROM change_events c JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = ? AND r.user_id = ? AND c.status = 'analyzed'
       AND (? IS NULL OR c.repository_id = ?) AND (? IS NULL OR r.connection_id = ?)
       AND r.role = 'SOURCE' AND r.excluded = 0
       AND NOT EXISTS (
         SELECT 1 FROM approvals p WHERE p.user_id = c.user_id AND p.change_event_id = c.id
       )
       AND COALESCE((
         SELECT json_extract(a.output_json, '$.classification') FROM agent_runs a
         WHERE a.change_event_id = c.id AND a.user_id = c.user_id
           AND a.agent_name = 'curator' AND a.status = 'completed'
         ORDER BY a.completed_at DESC LIMIT 1
       ), '') NOT IN ('UNCHANGED', 'IGNORE')
       ORDER BY c.created_at`,
      )
      .bind(
        userId,
        userId,
        repositoryId ?? null,
        repositoryId ?? null,
        connectionId ?? null,
        connectionId ?? null,
      );
    const rows = await statement.all<ChangeEventRow>();
    return rows.results.map(toChangeEvent);
  }

  async list(userId: string, limit = 50): Promise<ChangeEventRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM change_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .bind(userId, limit)
      .all<ChangeEventRow>();
    return rows.results.map(toChangeEvent);
  }
}
