import { newId, nowIso } from "@exokortex/shared";

export interface PortfolioProfileRecord {
  id: string;
  userId: string;
  repositoryId: string;
  framework: string;
  projectDataPath: string;
  testCommand: string;
  buildCommand: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  repository_id: string;
  framework: string;
  project_data_path: string;
  test_command: string;
  build_command: string;
}

function toProfile(row: ProfileRow): PortfolioProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    repositoryId: row.repository_id,
    framework: row.framework,
    projectDataPath: row.project_data_path,
    testCommand: row.test_command,
    buildCommand: row.build_command,
  };
}

export class PortfolioProfileRepository {
  constructor(private readonly db: D1Database) {}

  async findByRepository(
    userId: string,
    repositoryId: string,
  ): Promise<PortfolioProfileRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM portfolio_profiles WHERE user_id = ? AND repository_id = ?")
      .bind(userId, repositoryId)
      .first<ProfileRow>();
    return row ? toProfile(row) : null;
  }

  async save(input: {
    userId: string;
    repositoryId: string;
    framework: string;
    projectDataPath: string;
    testCommand: string;
    buildCommand: string;
    now?: string;
  }): Promise<PortfolioProfileRecord> {
    const existing = await this.findByRepository(input.userId, input.repositoryId);
    if (existing) return existing;
    const now = input.now ?? nowIso();
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO portfolio_profiles
         (id, user_id, repository_id, framework, project_data_path, test_command, build_command, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (repository_id) DO NOTHING`,
      )
      .bind(
        id,
        input.userId,
        input.repositoryId,
        input.framework,
        input.projectDataPath,
        input.testCommand,
        input.buildCommand,
        now,
        now,
      )
      .run();
    const stored = await this.findByRepository(input.userId, input.repositoryId);
    if (!stored) throw new Error("portfolio profile insert did not persist");
    return stored;
  }
}
