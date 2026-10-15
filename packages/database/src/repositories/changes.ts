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

  async listOpen(userId: string, repositoryId?: string): Promise<ChangeEventRecord[]> {
    const statement = repositoryId
      ? this.db
          .prepare(
            `SELECT * FROM change_events
             WHERE user_id = ? AND repository_id = ? AND status = 'open'
             ORDER BY created_at LIMIT 20`,
          )
          .bind(userId, repositoryId)
      : this.db
          .prepare(
            `SELECT * FROM change_events
             WHERE user_id = ? AND status = 'open'
             ORDER BY created_at LIMIT 20`,
          )
          .bind(userId);
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

  async list(userId: string, limit = 50): Promise<ChangeEventRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM change_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .bind(userId, limit)
      .all<ChangeEventRow>();
    return rows.results.map(toChangeEvent);
  }
}
