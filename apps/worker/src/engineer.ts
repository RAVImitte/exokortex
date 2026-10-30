import type { GitHubProvider } from "@exokortex/github";
import type { LLMProvider } from "@exokortex/llm";
import {
  discoverPortfolioProfile,
  parseAnalystReport,
  portfolioBranch,
  profileManifests,
  projectDataFile,
  proposeEngineerEdit,
  templateContractFromMarker,
} from "@exokortex/orchestrator";
import type { Database } from "@exokortex/database";
import { AppError } from "@exokortex/shared";

export async function portfolioInstallation(db: Database, userId: string): Promise<string> {
  const portfolio = await db.repos.findByRole(userId, "PORTFOLIO");
  if (!portfolio)
    throw new AppError(
      "no_portfolio",
      "Mark a portfolio repository before approving a change",
      409,
    );
  const connection = await db.connections.findOwned(userId, portfolio.connectionId);
  if (
    connection?.provider !== "github" ||
    connection.status !== "active" ||
    !connection.externalInstallationId
  ) {
    throw new AppError(
      "not_connected",
      "Reconnect the portfolio's GitHub account before approving a change",
      409,
    );
  }
  return connection.externalInstallationId;
}

export async function ensurePortfolioProfile(
  db: Database,
  provider: GitHubProvider | null,
  userId: string,
  repositoryId: string,
): Promise<void> {
  if (await db.profiles.findByRepository(userId, repositoryId)) return;
  const repo = await db.repos.find(userId, repositoryId);
  if (!repo || repo.role !== "PORTFOLIO" || !provider) return;
  const connection = (await db.connections.list(userId)).find(
    (item) => item.id === repo.connectionId && item.status === "active",
  );
  if (!connection?.externalInstallationId) return;
  const githubRepo = {
    externalId: repo.externalId,
    name: repo.name,
    defaultBranch: repo.defaultBranch ?? "main",
  };
  const connectionRef = { installationId: connection.externalInstallationId };
  const paths = await provider.listTree(connectionRef, githubRepo);
  const files = [];
  for (const path of profileManifests(paths)) {
    try {
      files.push(await provider.getFile(connectionRef, githubRepo, path));
    } catch {
      continue;
    }
  }
  const draft = discoverPortfolioProfile({ paths, files });
  await db.profiles.save({
    userId,
    repositoryId,
    framework: draft.framework,
    projectDataPath: draft.projectDataPath,
    testCommand: draft.testCommand,
    buildCommand: draft.buildCommand,
  });
}

export async function runEngineerJob(input: {
  db: Database;
  provider: GitHubProvider;
  llm: LLMProvider;
  userId: string;
  approvalId: string;
  installationId: string;
}): Promise<{ url: string; projectName: string } | null> {
  const approval = await input.db.approvals.get(input.userId, input.approvalId);
  if (!approval || approval.status !== "approved") {
    throw new Error("engineer job is missing an approved change");
  }
  if (approval.pullRequestUrl) return null;
  if (!approval.projectId) throw new Error("engineer job is missing a project");
  const project = (await input.db.projects.list(input.userId)).find(
    (item) => item.id === approval.projectId,
  );
  if (!project) throw new Error("engineer job is missing a project");
  const portfolio = await input.db.repos.findByRole(input.userId, "PORTFOLIO");
  if (!portfolio)
    throw new Error("Mark a portfolio repository before the Engineer can open a pull request");
  await ensurePortfolioProfile(input.db, input.provider, input.userId, portfolio.id);
  const profile = await input.db.profiles.findByRepository(input.userId, portfolio.id);
  if (!profile) throw new Error("Portfolio profile is missing");
  const source = approval.changeEventId
    ? await input.db.changes.get(input.userId, approval.changeEventId)
    : null;
  const sourceRepo = source ? await input.db.repos.find(input.userId, source.repositoryId) : null;
  const analystRaw = source
    ? await input.db.agents.latestOutput(input.userId, source.id, "analyst")
    : null;
  const analyst = analystRaw ? parseAnalystReport(analystRaw) : null;
  const githubRepo = {
    externalId: portfolio.externalId,
    name: portfolio.name,
    defaultBranch: portfolio.defaultBranch ?? "main",
  };
  const connectionRef = { installationId: await portfolioInstallation(input.db, input.userId) };
  const dataPath = projectDataFile(profile.projectDataPath, project.slug);
  let marker: string | null = null;
  try {
    marker = (await input.provider.getFile(connectionRef, githubRepo, "exokortex.json")).content;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("returned 404")) throw error;
    // A missing marker means a hand-built portfolio. The initial null stands.
  }
  const editProfile = {
    ...profile,
    projectDataPath: dataPath,
    contract: templateContractFromMarker(marker),
  };
  let currentContent: string | null;
  try {
    currentContent = (await input.provider.getFile(connectionRef, githubRepo, dataPath)).content;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("returned 404")) throw error;
    currentContent = null;
  }
  const change = await proposeEngineerEdit({
    llm: input.llm,
    repositoryName: portfolio.name,
    profile: editProfile,
    project: {
      slug: project.slug,
      name: project.name,
      description: analyst?.purpose || project.description,
      architecture: analyst?.architecture ?? null,
      technologies: analyst?.technologies.length ? analyst.technologies : project.technologies,
      sourceUrl: sourceRepo?.url ?? "",
    },
    currentContent,
  });
  const pull = await input.provider.openPullRequest({
    connection: connectionRef,
    repository: githubRepo,
    branch: portfolioBranch(project.slug, approval.id),
    path: change.path,
    content: change.content,
    commitMessage: change.commitMessage,
    prTitle: change.prTitle,
    prBody: change.prBody,
  });
  await input.db.approvals.setPullRequestUrl(input.userId, approval.id, pull.url);
  if (approval.changeEventId) {
    await input.db.agents.complete({
      userId: input.userId,
      changeEventId: approval.changeEventId,
      agentName: "engineer",
      outputJson: JSON.stringify({ ...change, pullRequestUrl: pull.url }),
    });
  }
  return { url: pull.url, projectName: project.name };
}
