import { newId, nowIso } from "@exokortex/shared";
import type { LlmConfigRecord } from "../types.js";

export class LlmConfigRepository {
  constructor(private readonly db: D1Database) {}

  async get(userId: string): Promise<LlmConfigRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, provider, base_url, model, key_version, updated_at
         FROM llm_configs WHERE user_id = ?`,
      )
      .bind(userId)
      .first<{
        id: string;
        user_id: string;
        provider: string;
        base_url: string;
        model: string;
        key_version: number;
        updated_at: string;
      }>();
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      baseUrl: row.base_url,
      model: row.model,
      keyVersion: row.key_version,
      updatedAt: row.updated_at,
    };
  }

  async ciphertext(userId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT encrypted_api_key FROM llm_configs WHERE user_id = ?")
      .bind(userId)
      .first<{ encrypted_api_key: string }>();
    return row?.encrypted_api_key ?? null;
  }

  async save(input: {
    userId: string;
    provider: string;
    baseUrl: string;
    model: string;
    encryptedApiKey: string;
    keyVersion: number;
    now?: string;
  }): Promise<void> {
    const now = input.now ?? nowIso();
    await this.db
      .prepare(
        `INSERT INTO llm_configs
         (id, user_id, provider, base_url, model, encrypted_api_key, key_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           provider = excluded.provider,
           base_url = excluded.base_url,
           model = excluded.model,
           encrypted_api_key = excluded.encrypted_api_key,
           key_version = excluded.key_version,
           updated_at = excluded.updated_at`,
      )
      .bind(
        newId(),
        input.userId,
        input.provider,
        input.baseUrl,
        input.model,
        input.encryptedApiKey,
        input.keyVersion,
        now,
        now,
      )
      .run();
  }
}
