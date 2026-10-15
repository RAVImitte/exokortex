import { newId, nowIso } from "@exokortex/shared";
import { toConnection, type ConnectionRow } from "../rows.js";
import type { ConnectionRecord } from "../types.js";

export class ConnectionRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(input: {
    userId: string;
    provider: string;
    externalInstallationId: string;
    externalUserId?: string | null;
    encryptedCredentials: string;
    now?: string;
  }): Promise<ConnectionRecord> {
    const now = input.now ?? nowIso();
    const existing = await this.db
      .prepare(
        `SELECT * FROM connections
         WHERE user_id = ? AND provider = ? AND external_installation_id = ?`,
      )
      .bind(input.userId, input.provider, input.externalInstallationId)
      .first<ConnectionRow>();
    if (existing) {
      await this.db
        .prepare(
          `UPDATE connections
           SET encrypted_credentials = ?, external_user_id = ?, status = 'active', updated_at = ?
           WHERE id = ? AND user_id = ?`,
        )
        .bind(
          input.encryptedCredentials,
          input.externalUserId ?? null,
          now,
          existing.id,
          input.userId,
        )
        .run();
      return toConnection({ ...existing, status: "active" });
    }
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO connections
         (id, user_id, provider, external_user_id, external_installation_id, encrypted_credentials, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      )
      .bind(
        id,
        input.userId,
        input.provider,
        input.externalUserId ?? null,
        input.externalInstallationId,
        input.encryptedCredentials,
        now,
        now,
      )
      .run();
    return {
      id,
      userId: input.userId,
      provider: input.provider,
      externalUserId: input.externalUserId ?? null,
      externalInstallationId: input.externalInstallationId,
      status: "active",
    };
  }

  async list(userId: string): Promise<ConnectionRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM connections WHERE user_id = ? ORDER BY created_at")
      .bind(userId)
      .all<ConnectionRow>();
    return rows.results.map(toConnection);
  }

  async findByInstallation(installationId: string): Promise<ConnectionRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM connections
         WHERE provider = 'github' AND external_installation_id = ? AND status = 'active'
         LIMIT 1`,
      )
      .bind(installationId)
      .first<ConnectionRow>();
    return row ? toConnection(row) : null;
  }

  async disconnect(userId: string, connectionId: string, now = nowIso()): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE connections
         SET status = 'revoked', encrypted_credentials = NULL, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(now, connectionId, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}
