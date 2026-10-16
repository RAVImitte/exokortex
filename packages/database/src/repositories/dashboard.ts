export interface DashboardActivity {
  id: string;
  repositoryName: string;
  fromRevision: string;
  toRevision: string;
  summary: string | null;
  significance: string | null;
  status: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  repositoryCount: number;
  portfolioProjectCount: number;
  pendingApprovals: number;
  lastScan: string | null;
  nextScan: string | null;
  githubConnected: boolean;
  llmConfigured: boolean;
  recentActivity: DashboardActivity[];
}

export class DashboardRepository {
  constructor(private readonly db: D1Database) {}

  async snapshot(userId: string): Promise<DashboardSnapshot> {
    const repos = await this.db
      .prepare("SELECT COUNT(*) AS n FROM repositories WHERE user_id = ?")
      .bind(userId)
      .first<{ n: number }>();
    const projects = await this.db
      .prepare("SELECT COUNT(*) AS n FROM portfolio_projects WHERE user_id = ?")
      .bind(userId)
      .first<{ n: number }>();
    const approvals = await this.db
      .prepare("SELECT COUNT(*) AS n FROM approvals WHERE user_id = ? AND status = 'pending'")
      .bind(userId)
      .first<{ n: number }>();
    const last = await this.db
      .prepare("SELECT MAX(last_scanned_at) AS last_scan FROM repositories WHERE user_id = ?")
      .bind(userId)
      .first<{ last_scan: string | null }>();
    const user = await this.db
      .prepare("SELECT next_scan_at FROM users WHERE id = ?")
      .bind(userId)
      .first<{ next_scan_at: string | null }>();
    const github = await this.db
      .prepare(
        `SELECT id FROM connections
         WHERE user_id = ? AND provider = 'github' AND status = 'active'
         LIMIT 1`,
      )
      .bind(userId)
      .first<{ id: string }>();
    const llm = await this.db
      .prepare("SELECT id FROM llm_configs WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ id: string }>();
    const activity = await this.db
      .prepare(
        `SELECT c.id, r.name AS repository_name, c.from_revision, c.to_revision,
                c.summary, c.significance, c.status, c.created_at
         FROM change_events c
         JOIN repositories r ON r.id = c.repository_id AND r.user_id = c.user_id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC
         LIMIT 8`,
      )
      .bind(userId)
      .all<{
        id: string;
        repository_name: string;
        from_revision: string;
        to_revision: string;
        summary: string | null;
        significance: string | null;
        status: string;
        created_at: string;
      }>();
    return {
      repositoryCount: repos?.n ?? 0,
      portfolioProjectCount: projects?.n ?? 0,
      pendingApprovals: approvals?.n ?? 0,
      lastScan: last?.last_scan ?? null,
      nextScan: user?.next_scan_at ?? null,
      githubConnected: github !== null,
      llmConfigured: llm !== null,
      recentActivity: activity.results.map((row) => ({
        id: row.id,
        repositoryName: row.repository_name,
        fromRevision: row.from_revision,
        toRevision: row.to_revision,
        summary: row.summary,
        significance: row.significance,
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  }
}
