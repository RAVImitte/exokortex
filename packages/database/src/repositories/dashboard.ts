export interface DashboardSnapshot {
  repositoryCount: number;
  portfolioProjectCount: number;
  pendingApprovals: number;
  lastScan: string | null;
  nextScan: string | null;
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
    return {
      repositoryCount: repos?.n ?? 0,
      portfolioProjectCount: projects?.n ?? 0,
      pendingApprovals: approvals?.n ?? 0,
      lastScan: last?.last_scan ?? null,
      nextScan: user?.next_scan_at ?? null,
    };
  }
}
