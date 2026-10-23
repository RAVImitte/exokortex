import { Database, type ConnectionRecord, type RepositoryRecord } from "@exokortex/database";
import { explainGitHubWriteError, type GitHubProvider } from "@exokortex/github";
import { portfolioSeedFiles, projectFromSource } from "@exokortex/orchestrator";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";
import { githubProvider } from "../jobs.js";

const SEED_BRANCH = "exokortex/portfolio-seed";

export function registerPortfolioRoutes(app: Hono<AppBindings>): void {
  app.post("/api/portfolio/build", async (c) => {
    const provider = githubProvider(c.env);
    if (!provider) {
      throw new AppError("github_unconfigured", "GitHub App is not configured", 503);
    }
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const connections = await db.connections.list(userId);
    const existing = await db.repos.findByRole(userId, "PORTFOLIO");
    const sources = (await db.repos.list(userId)).filter(
      (repo) => repo.role === "SOURCE" && !repo.excluded && repo.id !== existing?.id,
    );
    if (sources.length === 0) {
      throw new AppError("no_sources", "Keep at least one repository as a source to extract", 409);
    }
    try {
      const projects = [];
      for (const source of sources.slice(0, 20)) {
        const connection = connections.find((item) => item.id === source.connectionId);
        let readme: string | null = null;
        let packageJson: string | null = null;
        if (connection?.provider === "github" && connection.externalInstallationId) {
          const ref = { installationId: connection.externalInstallationId };
          const repo = {
            externalId: source.externalId,
            name: source.name,
            defaultBranch: source.defaultBranch ?? "main",
          };
          readme = await readOptional(provider, ref, repo, "README.md");
          packageJson = await readOptional(provider, ref, repo, "package.json");
        }
        projects.push(
          projectFromSource({
            name: source.name,
            url: source.url,
            readme,
            packageJson,
          }),
        );
      }
      const portfolio =
        existing ?? (await createPortfolioRepository(db, provider, userId, connections));
      const portfolioConnection = connections.find(
        (item) => item.id === portfolio.connectionId && item.status === "active",
      );
      if (
        portfolioConnection?.provider !== "github" ||
        !portfolioConnection.externalInstallationId
      ) {
        throw new AppError("not_github", "The portfolio repository has to be on GitHub", 409);
      }
      const installation = { installationId: portfolioConnection.externalInstallationId };
      const githubRepo = {
        externalId: portfolio.externalId,
        name: portfolio.name,
        defaultBranch: portfolio.defaultBranch ?? "main",
      };
      let includeTemplate = !existing;
      if (existing) {
        try {
          const paths = await provider.listTree(installation, githubRepo);
          includeTemplate = !paths.includes("exokortex.json");
        } catch {
          includeTemplate = true;
        }
      }
      const files = portfolioSeedFiles({ projects, includeTemplate });
      const published = await provider.publishFiles({
        connection: installation,
        repository: githubRepo,
        branch: SEED_BRANCH,
        files,
        commitMessage: "Add a portfolio from connected repositories",
        prTitle: "Build the portfolio from connected repositories",
        prBody: [
          "Extracts the connected source repositories into the example portfolio template.",
          "",
          ...projects.map((project) => `- ${project.name}`),
        ].join("\n"),
      });
      return c.json({ ...published, projects: projects.length });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : "Could not build the portfolio";
      throw new AppError("github_write", explainGitHubWriteError(message), 502);
    }
  });
}

async function createPortfolioRepository(
  db: Database,
  provider: GitHubProvider,
  userId: string,
  connections: ConnectionRecord[],
): Promise<RepositoryRecord> {
  const github = connections.find(
    (item) => item.provider === "github" && item.status === "active" && item.externalInstallationId,
  );
  if (!github?.externalInstallationId) {
    throw new AppError("not_connected", "Connect GitHub before building a portfolio", 409);
  }
  const created = await provider.createRepository({
    connection: { installationId: github.externalInstallationId },
    name: "portfolio",
    description: "Portfolio built by ExoKortex from connected repositories.",
  });
  const saved = await db.repos.upsert({
    userId,
    connectionId: github.id,
    externalId: created.externalId,
    name: created.name,
    url: created.url,
    defaultBranch: created.defaultBranch,
  });
  const portfolio = await db.repos.setRole(userId, saved.record.id, "PORTFOLIO");
  if (!portfolio)
    throw new AppError("portfolio_save", "The new portfolio repository was not saved", 500);
  return portfolio;
}

async function readOptional(
  provider: NonNullable<ReturnType<typeof githubProvider>>,
  connection: { installationId: string },
  repository: { externalId: string; name: string; defaultBranch: string },
  path: string,
): Promise<string | null> {
  try {
    const file = await provider.getFile(connection, repository, path);
    return file.content;
  } catch (error) {
    if (error instanceof Error && error.message.includes("returned 404")) return null;
    throw error;
  }
}
