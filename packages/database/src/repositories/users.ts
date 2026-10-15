import { newId, nowIso } from "@exokortex/shared";
import { toUser, type UserRow } from "../rows.js";
import type { UserRecord } from "../types.js";

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async findBySubject(authSubject: string): Promise<UserRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE auth_subject = ?")
      .bind(authSubject)
      .first<UserRow>();
    return row ? toUser(row) : null;
  }

  async find(userId: string): Promise<UserRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<UserRow>();
    return row ? toUser(row) : null;
  }

  async upsert(input: { authSubject: string; email: string; now?: string }): Promise<UserRecord> {
    const now = input.now ?? nowIso();
    const existing = await this.findBySubject(input.authSubject);
    if (existing) {
      await this.db
        .prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ?")
        .bind(input.email, now, existing.id)
        .run();
      return { ...existing, email: input.email, updatedAt: now };
    }
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO users (id, auth_subject, email, timezone, status, scan_frequency, next_scan_at, created_at, updated_at)
         VALUES (?, ?, ?, 'UTC', 'active', 'weekly', NULL, ?, ?)`,
      )
      .bind(id, input.authSubject, input.email, now, now)
      .run();
    const created = await this.find(id);
    if (!created) throw new Error("user insert did not persist");
    return created;
  }

  async updateSettings(
    userId: string,
    input: { timezone?: string; scanFrequency?: string; nextScanAt?: string | null },
    now = nowIso(),
  ): Promise<void> {
    const user = await this.find(userId);
    if (!user) return;
    await this.db
      .prepare(
        "UPDATE users SET timezone = ?, scan_frequency = ?, next_scan_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(
        input.timezone ?? user.timezone,
        input.scanFrequency ?? user.scanFrequency,
        input.nextScanAt === undefined ? user.nextScanAt : input.nextScanAt,
        now,
        userId,
      )
      .run();
  }

  async listDue(now: string): Promise<UserRecord[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM users
         WHERE status = 'active' AND next_scan_at IS NOT NULL AND next_scan_at <= ?`,
      )
      .bind(now)
      .all<UserRow>();
    return rows.results.map(toUser);
  }

  async delete(userId: string): Promise<void> {
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  }
}
