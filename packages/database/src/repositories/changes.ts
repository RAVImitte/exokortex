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

  async list(userId: string, limit = 50): Promise<ChangeEventRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM change_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .bind(userId, limit)
      .all<ChangeEventRow>();
    return rows.results.map(toChangeEvent);
  }
}
