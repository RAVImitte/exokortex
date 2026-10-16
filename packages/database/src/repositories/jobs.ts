import { newId, nowIso } from "@exokortex/shared";
import { toJob, type JobRow } from "../rows.js";
import type { JobRecord } from "../types.js";

export class JobRepository {
  constructor(private readonly db: D1Database) {}

  async insert(input: {
    userId: string;
    type: string;
    payload: unknown;
    idempotencyKey: string;
    workflowId?: string | null;
    maxAttempts: number;
    now?: string;
  }): Promise<{ job: JobRecord; created: boolean }> {
    const now = input.now ?? nowIso();
    const id = newId();
    const result = await this.db
      .prepare(
        `INSERT INTO jobs
         (id, user_id, workflow_id, type, payload_json, status, attempts, max_attempts, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
         ON CONFLICT (idempotency_key) DO NOTHING`,
      )
      .bind(
        id,
        input.userId,
        input.workflowId ?? null,
        input.type,
        JSON.stringify(input.payload ?? {}),
        input.maxAttempts,
        input.idempotencyKey,
        now,
        now,
      )
      .run();
    if ((result.meta.changes ?? 0) > 0) {
      const job = await this.find(id);
      if (!job) throw new Error("job insert did not persist");
      return { job, created: true };
    }
    const existing = await this.db
      .prepare("SELECT * FROM jobs WHERE idempotency_key = ?")
      .bind(input.idempotencyKey)
      .first<JobRow>();
    if (!existing) throw new Error("job conflict did not return a row");
    return { job: toJob(existing), created: false };
  }

  async attachWorkflow(jobId: string, workflowId: string): Promise<void> {
    await this.db
      .prepare("UPDATE jobs SET workflow_id = ? WHERE id = ?")
      .bind(workflowId, jobId)
      .run();
  }

  async find(jobId: string): Promise<JobRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .bind(jobId)
      .first<JobRow>();
    return row ? toJob(row) : null;
  }

  async claim(jobId: string, now: string): Promise<JobRecord | null> {
    const result = await this.db
      .prepare(
        `UPDATE jobs
         SET status = 'locked', locked_at = ?, attempts = attempts + 1, updated_at = ?
         WHERE id = ? AND status = 'pending' AND (next_run_at IS NULL OR next_run_at <= ?)`,
      )
      .bind(now, now, jobId, now)
      .run();
    if ((result.meta.changes ?? 0) === 0) return null;
    return this.find(jobId);
  }

  async complete(jobId: string, now: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE jobs SET status = 'completed', last_error = NULL, updated_at = ? WHERE id = ?",
      )
      .bind(now, jobId)
      .run();
  }

  async fail(jobId: string, error: string, nextRunAt: string | null, now: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE jobs
         SET status = ?, last_error = ?, next_run_at = ?, locked_at = NULL, updated_at = ?
         WHERE id = ?`,
      )
      .bind(nextRunAt ? "pending" : "failed", error.slice(0, 500), nextRunAt, now, jobId)
      .run();
  }

  async releaseStuck(jobId: string, now: string, failed: boolean, error: string): Promise<void> {
    if (failed) {
      await this.fail(jobId, error, null, now);
      return;
    }
    await this.db
      .prepare(
        `UPDATE jobs
         SET status = 'pending', locked_at = NULL, next_run_at = ?, last_error = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, error, now, jobId)
      .run();
  }

  async countActive(workflowId: string, type: string, exceptJobId: string): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM jobs
         WHERE workflow_id = ? AND type = ? AND id != ? AND status IN ('pending', 'locked')`,
      )
      .bind(workflowId, type, exceptJobId)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  async listByType(userId: string, type: string): Promise<JobRecord[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM jobs WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50",
      )
      .bind(userId, type)
      .all<JobRow>();
    return rows.results.map(toJob);
  }

  async listDue(now: string): Promise<JobRecord[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM jobs
         WHERE status = 'pending' AND next_run_at IS NOT NULL AND next_run_at <= ?
         ORDER BY next_run_at LIMIT 50`,
      )
      .bind(now)
      .all<JobRow>();
    return rows.results.map(toJob);
  }

  async requeue(userId: string, jobId: string, now: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE jobs
         SET status = 'pending', attempts = 0, next_run_at = NULL, locked_at = NULL, last_error = NULL, updated_at = ?
         WHERE id = ? AND user_id = ? AND status IN ('pending', 'failed')`,
      )
      .bind(now, jobId, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listStuck(lockedBefore: string): Promise<JobRecord[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM jobs WHERE status = 'locked' AND locked_at IS NOT NULL AND locked_at <= ?",
      )
      .bind(lockedBefore)
      .all<JobRow>();
    return rows.results.map(toJob);
  }
}
