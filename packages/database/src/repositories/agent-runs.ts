import { newId, nowIso } from "@exokortex/shared";

export class AgentRunRepository {
  constructor(private readonly db: D1Database) {}

  async hasCompleted(userId: string, changeEventId: string, agentName: string): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT id FROM agent_runs
         WHERE user_id = ? AND change_event_id = ? AND agent_name = ? AND status = 'completed'
         LIMIT 1`,
      )
      .bind(userId, changeEventId, agentName)
      .first<{ id: string }>();
    return row !== null;
  }

  async latestOutput(
    userId: string,
    changeEventId: string,
    agentName: string,
  ): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT output_json FROM agent_runs
         WHERE user_id = ? AND change_event_id = ? AND agent_name = ? AND status = 'completed'
         ORDER BY completed_at DESC LIMIT 1`,
      )
      .bind(userId, changeEventId, agentName)
      .first<{ output_json: string | null }>();
    return row?.output_json ?? null;
  }

  async complete(input: {
    userId: string;
    changeEventId: string;
    agentName: string;
    outputJson: string;
    now?: string;
  }): Promise<void> {
    const now = input.now ?? nowIso();
    await this.db
      .prepare(
        `INSERT INTO agent_runs
         (id, user_id, change_event_id, agent_name, input_reference, output_reference, output_json, status, attempts, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'completed', 1, ?, ?)`,
      )
      .bind(
        newId(),
        input.userId,
        input.changeEventId,
        input.agentName,
        `change:${input.changeEventId}`,
        input.outputJson,
        now,
        now,
      )
      .run();
  }
}
