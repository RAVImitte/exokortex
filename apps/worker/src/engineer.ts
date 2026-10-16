import type { GitHubProvider } from "@exokortex/github";
import type { LLMProvider } from "@exokortex/llm";
import {
  discoverPortfolioProfile,
  portfolioBranch,
  profileManifests,
  proposeEngineerEdit,
} from "@exokortex/orchestrator";
import type { Database } from "@exokortex/database";

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
}): Promise<void> {
  const approval = await input.db.approvals.get(input.userId, input.approvalId);
  if (!approval || approval.status !== "approved") {
    throw new Error("engineer job is missing an approved change");
  }
  if (approval.pullRequestUrl) return;
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
  const githubRepo = {
    externalId: portfolio.externalId,
    name: portfolio.name,
    defaultBranch: portfolio.defaultBranch ?? "main",
  };
  const connectionRef = { installationId: input.installationId };
  let currentContent: string | null;
  try {
    currentContent = (
      await input.provider.getFile(connectionRef, githubRepo, profile.projectDataPath)
    ).content;
  } catch {
    currentContent = null;
  }
  const change = await proposeEngineerEdit({
    llm: input.llm,
    repositoryName: portfolio.name,
    profile,
    project: {
      slug: project.slug,
      name: project.name,
      description: project.description,
      technologies: project.technologies,
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
}
