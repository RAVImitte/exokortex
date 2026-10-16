import { isRepositoryRole, limits, type RepositoryRole } from "@exokortex/core";
import { newId, nowIso } from "@exokortex/shared";
import { toRepository, type RepositoryRow } from "../rows.js";
import type { RepositoryRecord } from "../types.js";

export class TrackedRepositoryRepository {
  constructor(private readonly db: D1Database) {}

  async count(userId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM repositories WHERE user_id = ?")
      .bind(userId)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  async upsert(input: {
    userId: string;
    connectionId: string;
    externalId: string;
    name: string;
    url: string;
    defaultBranch: string | null;
    now?: string;
  }): Promise<{ record: RepositoryRecord; created: boolean }> {
    const now = input.now ?? nowIso();
    const existing = await this.db
      .prepare(
        "SELECT * FROM repositories WHERE user_id = ? AND connection_id = ? AND external_id = ?",
      )
      .bind(input.userId, input.connectionId, input.externalId)
      .first<RepositoryRow>();
    if (existing) {
      await this.db
        .prepare(
          `UPDATE repositories SET name = ?, url = ?, default_branch = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
        )
        .bind(input.name, input.url, input.defaultBranch, now, existing.id, input.userId)
        .run();
      return {
        created: false,
        record: toRepository({
          ...existing,
          name: input.name,
          url: input.url,
          default_branch: input.defaultBranch,
        }),
      };
    }
    if ((await this.count(input.userId)) >= limits.maxRepositories) {
      throw new Error(`repository limit of ${limits.maxRepositories} reached`);
    }
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO repositories
         (id, user_id, connection_id, external_id, name, url, default_branch, role, excluded, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SOURCE', 0, ?, ?)`,
      )
      .bind(
        id,
        input.userId,
        input.connectionId,
        input.externalId,
        input.name,
        input.url,
        input.defaultBranch,
        now,
        now,
      )
      .run();
    const row = await this.find(input.userId, id);
    if (!row) throw new Error("repository insert did not persist");
    return { created: true, record: row };
  }

  async list(userId: string): Promise<RepositoryRecord[]> {
    const rows = await this.db
      .prepare("SELECT * FROM repositories WHERE user_id = ? ORDER BY name")
      .bind(userId)
      .all<RepositoryRow>();
    return rows.results.map(toRepository);
  }

  async findByRole(userId: string, role: RepositoryRole): Promise<RepositoryRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM repositories WHERE user_id = ? AND role = ? LIMIT 1")
      .bind(userId, role)
      .first<RepositoryRow>();
    return row ? toRepository(row) : null;
  }

  async find(userId: string, repositoryId: string): Promise<RepositoryRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM repositories WHERE id = ? AND user_id = ?")
      .bind(repositoryId, userId)
      .first<RepositoryRow>();
    return row ? toRepository(row) : null;
  }

  async findByExternalId(externalId: string): Promise<RepositoryRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM repositories WHERE external_id = ? LIMIT 1")
      .bind(externalId)
      .first<RepositoryRow>();
    return row ? toRepository(row) : null;
  }

  async setRole(
    userId: string,
    repositoryId: string,
    role: RepositoryRole,
    now = nowIso(),
  ): Promise<RepositoryRecord | null> {
    if (!isRepositoryRole(role)) return null;
    if (role === "PORTFOLIO") {
      await this.db
        .prepare(
          `UPDATE repositories SET role = 'SOURCE', excluded = 0, updated_at = ?
           WHERE user_id = ? AND role = 'PORTFOLIO' AND id != ?`,
        )
        .bind(now, userId, repositoryId)
        .run();
    }
    const result = await this.db
      .prepare(
        "UPDATE repositories SET role = ?, excluded = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      )
      .bind(role, role === "EXCLUDED" ? 1 : 0, now, repositoryId, userId)
      .run();
    if ((result.meta.changes ?? 0) === 0) return null;
    return this.find(userId, repositoryId);
  }

  async markScanned(
    userId: string,
    repositoryId: string,
    revision: string,
    scannedAt: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE repositories
         SET last_revision = ?, last_scanned_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(revision, scannedAt, scannedAt, repositoryId, userId)
      .run();
  }
}
