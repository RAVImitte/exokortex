import { newId, nowIso } from "@exokortex/shared";

export interface ProjectRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  technologies_json: string;
  status: string;
}

export interface PortfolioProjectRecord {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  technologies: string[];
  status: string;
}

function toProject(row: ProjectRow): PortfolioProjectRecord {
  const parsed = JSON.parse(row.technologies_json) as unknown;
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    technologies: Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [],
    status: row.status,
  };
}

export class PortfolioProjectRepository {
  constructor(private readonly db: D1Database) {}

  async list(userId: string): Promise<PortfolioProjectRecord[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM portfolio_projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200",
      )
      .bind(userId)
      .all<ProjectRow>();
    return rows.results.map(toProject);
  }

  async findBySlug(userId: string, slug: string): Promise<PortfolioProjectRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM portfolio_projects WHERE user_id = ? AND slug = ?")
      .bind(userId, slug)
      .first<ProjectRow>();
    return row ? toProject(row) : null;
  }

  async create(input: {
    userId: string;
    slug: string;
    name: string;
    description: string | null;
    technologies: string[];
    now?: string;
  }): Promise<PortfolioProjectRecord> {
    const now = input.now ?? nowIso();
    const existing = await this.findBySlug(input.userId, input.slug);
    if (existing) return existing;
    const id = newId();
    await this.db
      .prepare(
        `INSERT INTO portfolio_projects
         (id, user_id, slug, name, description, technologies_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      )
      .bind(
        id,
        input.userId,
        input.slug,
        input.name,
        input.description,
        JSON.stringify(input.technologies),
        now,
        now,
      )
      .run();
    return {
      id,
      userId: input.userId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      technologies: input.technologies,
      status: "active",
    };
  }

  async linkSource(projectId: string, repositoryId: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO project_sources (project_id, repository_id)
         VALUES (?, ?)
         ON CONFLICT (project_id, repository_id) DO NOTHING`,
      )
      .bind(projectId, repositoryId)
      .run();
  }
}
