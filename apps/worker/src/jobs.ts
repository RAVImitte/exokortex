import { scoutReport, type ScoutReport } from "@exokortex/agents";
import { limits, type WorkflowState } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { explainGitHubWriteError, GitHubProvider } from "@exokortex/github";
import { engineerKey, maxAttemptsFor, nextRunIso, shouldRetry } from "@exokortex/jobs";
import { OpenAICompatibleProvider, type LLMProvider } from "@exokortex/llm";
import {
  analyzeChange,
  analystContextFiles,
  approvalAction,
  portfolioTarget,
  curateWithFollowups,
  parseAnalystReport,
  runAgentPass,
  runUserScan,
  scoutChange,
  shouldAnalyzeChange,
  type AnalysisChange,
  type AnalysisHooks,
} from "@exokortex/orchestrator";
import { decryptString, importAesKey } from "@exokortex/security";
import { log, nowIso } from "@exokortex/shared";
import type { Env, JobMessage } from "./env.js";
import { runEngineerJob } from "./engineer.js";

export function githubProvider(env: Env): GitHubProvider | null {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) return null;
  return new GitHubProvider({
    appId: env.GITHUB_APP_ID,
    privateKeyPem: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
}

export async function enqueueScan(
  env: Env,
  db: Database,
  input: {
    userId: string;
    installationId: string;
    repositoryId?: string;
    idempotencyKey: string;
    forceAnalyze?: boolean;
  },
): Promise<{ created: boolean; jobId: string }> {
  const now = nowIso();
  const { job, created } = await db.jobs.insert({
    userId: input.userId,
    type: "scan",
    payload: {
      installationId: input.installationId,
      repositoryId: input.repositoryId,
      forceAnalyze: input.forceAnalyze === true,
    },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: maxAttemptsFor("scan"),
    now,
  });
  if (!created) return { created: false, jobId: job.id };
  const workflow = await db.workflows.create(input.userId, "SCAN_PENDING", now);
  await db.jobs.attachWorkflow(job.id, workflow.id);
  await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  return { created: true, jobId: job.id };
}

export async function enqueueCurate(
  env: Env,
  db: Database,
  input: { userId: string; changeId: string; idempotencyKey: string },
): Promise<{ created: boolean; jobId: string }> {
  const now = nowIso();
  const { job, created } = await db.jobs.insert({
    userId: input.userId,
    type: "curate",
    payload: { changeEventId: input.changeId },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: maxAttemptsFor("scan"),
    now,
  });
  if (!created) return { created: false, jobId: job.id };
  const workflow = await db.workflows.create(input.userId, "CURATING", now);
  await db.jobs.attachWorkflow(job.id, workflow.id);
  await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  return { created: true, jobId: job.id };
}

export async function enqueueEngineer(
  db: Database,
  input: {
    userId: string;
    workflowId: string | null;
    approvalId: string;
    installationId: string;
  },
): Promise<{ created: boolean; jobId: string }> {
  const { job, created } = await db.jobs.insert({
    userId: input.userId,
    workflowId: input.workflowId,
    type: "engineer",
    payload: { approvalId: input.approvalId, installationId: input.installationId },
    idempotencyKey: engineerKey(input.userId, input.approvalId),
    maxAttempts: maxAttemptsFor("engineer"),
  });
  return { created, jobId: job.id };
}

export async function handleJob(env: Env, jobId: string): Promise<void> {
  const db = new Database(env.DB);
  const now = nowIso();
  const claimed = await db.jobs.claim(jobId, now);
  if (!claimed) return;
  try {
    if (claimed.type === "engineer") {
      const payload = JSON.parse(claimed.payloadJson) as {
        approvalId?: string;
        installationId?: string;
      };
      if (!payload.approvalId || !payload.installationId) {
        throw new Error("engineer job is missing its payload");
      }
      const provider = githubProvider(env);
      if (!provider) throw new Error("GitHub App is not configured");
      await runEngineerJob({
        db,
        provider,
        llm: await userLlm(env, db, claimed.userId),
        userId: claimed.userId,
        approvalId: payload.approvalId,
        installationId: payload.installationId,
      });
      await db.jobs.complete(jobId, now);
      if (claimed.workflowId) {
        const active = await db.jobs.countActive(claimed.workflowId, "engineer", jobId);
        if (active === 0) {
          await move(db, claimed.userId, claimed.workflowId, "COMPLETED", now);
        }
      }
      log("info", "engineer completed", { userId: claimed.userId, jobId });
      return;
    }
    if (claimed.type === "curate") {
      const payload = JSON.parse(claimed.payloadJson) as { changeEventId?: string };
      if (!payload.changeEventId) throw new Error("curate job is missing a change id");
      const llm = await userLlm(env, db, claimed.userId);
      await curateReady(
        db,
        llm,
        claimed.userId,
        claimed.workflowId,
        undefined,
        now,
        payload.changeEventId,
      );
      const pending = claimed.workflowId
        ? await db.approvals.listPending(claimed.userId, claimed.workflowId)
        : [];
      await move(
        db,
        claimed.userId,
        claimed.workflowId,
        pending.length > 0 ? "PENDING_APPROVAL" : "COMPLETED",
        now,
      );
      await db.jobs.complete(jobId, now);
      log("info", "curate completed", {
        userId: claimed.userId,
        jobId,
        pendingApprovals: pending.length,
      });
      return;
    }
    if (claimed.type !== "scan") throw new Error(`unsupported job type ${claimed.type}`);
    const payload = JSON.parse(claimed.payloadJson) as {
      installationId?: string;
      repositoryId?: string;
      forceAnalyze?: boolean;
    };
    const forceAnalyze = payload.forceAnalyze === true;
    if (!payload.installationId) throw new Error("scan job is missing an installation id");
    const provider = githubProvider(env);
    if (!provider) throw new Error("GitHub App is not configured");
    if (claimed.workflowId) {
      try {
        await db.workflows.transition(claimed.userId, claimed.workflowId, "SCANNING", now);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Illegal workflow transition"))
          throw error;
      }
    }
    const summary = await runUserScan({
      db,
      provider,
      userId: claimed.userId,
      installationId: payload.installationId,
      repositoryId: payload.repositoryId,
      now,
    });
    const open = await db.changes.listOpen(claimed.userId, payload.repositoryId);
    const waiting =
      open.length === 0
        ? await db.changes.listReadyForCurator(claimed.userId, payload.repositoryId)
        : [];
    if (open.length === 0 && waiting.length === 0) {
      await move(db, claimed.userId, claimed.workflowId, "COMPLETED", now);
      await db.jobs.complete(jobId, now);
      log("info", "scan completed", { userId: claimed.userId, jobId, ...summary });
      return;
    }
    const llm = await userLlm(env, db, claimed.userId);
    const repos = await db.repos.list(claimed.userId);
    if (open.length === 0) {
      await curateReady(db, llm, claimed.userId, claimed.workflowId, payload.repositoryId, now);
      const pending = claimed.workflowId
        ? await db.approvals.listPending(claimed.userId, claimed.workflowId)
        : [];
      await move(
        db,
        claimed.userId,
        claimed.workflowId,
        pending.length > 0 ? "PENDING_APPROVAL" : "COMPLETED",
        now,
      );
      await db.jobs.complete(jobId, now);
      log("info", "scan completed", {
        userId: claimed.userId,
        jobId,
        ...summary,
        pendingApprovals: pending.length,
      });
      return;
    }
    const targets = open.flatMap((change) => {
      const repo = repos.find((item) => item.id === change.repositoryId);
      if (!repo) return [];
      return [
        {
          id: change.id,
          repositoryName: repo.name,
          defaultBranch: repo.defaultBranch ?? "main",
          fromRevision: change.fromRevision,
          toRevision: change.toRevision,
        } satisfies AnalysisChange,
      ];
    });
    const hooks = agentHooks(db, claimed.userId);
    const scouted = new Map<string, ScoutReport>();
    await move(db, claimed.userId, claimed.workflowId, "SCOUTING", now);
    await runAgentPass({
      changes: targets,
      agent: "scout",
      hooks,
      run: async (change) => {
        const repo = repos.find((item) => item.name === change.repositoryName);
        if (!repo) throw new Error(`repository missing for ${change.repositoryName}`);
        const files = await provider.getChanges(
          { installationId: payload.installationId! },
          { externalId: repo.externalId, name: repo.name, defaultBranch: change.defaultBranch },
          change.fromRevision,
          change.toRevision,
        );
        const report = await scoutChange({ llm, change, files });
        scouted.set(change.id, report);
        return report;
      },
      after: async (change, report) => {
        if (shouldAnalyzeChange(report, forceAnalyze)) return;
        await db.changes.mark(claimed.userId, change.id, {
          summary: report.summary,
          significance: report.significance,
          status: "ignored",
          now,
        });
      },
    });
    await move(db, claimed.userId, claimed.workflowId, "ANALYZING", now);
    const meaningful: AnalysisChange[] = [];
    for (const change of targets) {
      const scout = await scoutFor(db, claimed.userId, change.id, scouted);
      if (shouldAnalyzeChange(scout, forceAnalyze)) meaningful.push(change);
    }
    await runAgentPass({
      changes: meaningful,
      agent: "analyst",
      hooks,
      run: async (change) => {
        const scout = await scoutFor(db, claimed.userId, change.id, scouted);
        const repo = repos.find((item) => item.name === change.repositoryName);
        if (!repo) throw new Error(`repository missing for ${change.repositoryName}`);
        const files = [];
        for (const path of analystContextFiles) {
          const file = await readFile(
            provider,
            payload.installationId!,
            repo,
            change.defaultBranch,
            path,
            change.toRevision,
          );
          if (file) files.push(file);
        }
        return analyzeChange({ llm, change, scout, files });
      },
      after: async (change, report) => {
        const scout = scouted.get(change.id);
        await db.changes.mark(claimed.userId, change.id, {
          summary: report.purpose,
          significance: scout?.significance ?? "low",
          status: "analyzed",
          now,
        });
      },
    });
    await curateReady(db, llm, claimed.userId, claimed.workflowId, payload.repositoryId, now);
    const pending = claimed.workflowId
      ? await db.approvals.listPending(claimed.userId, claimed.workflowId)
      : [];
    await move(
      db,
      claimed.userId,
      claimed.workflowId,
      pending.length > 0 ? "PENDING_APPROVAL" : "COMPLETED",
      now,
    );
    await db.jobs.complete(jobId, now);
    log("info", "scan completed", {
      userId: claimed.userId,
      jobId,
      ...summary,
      analyzed: targets.length,
      pendingApprovals: pending.length,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "job failed";
    const message = claimed.type === "engineer" ? explainGitHubWriteError(raw) : raw;
    const retry = shouldRetry(claimed.attempts, claimed.maxAttempts);
    await db.jobs.fail(
      jobId,
      message,
      retry ? nextRunIso(new Date(), claimed.attempts) : null,
      now,
    );
    if (claimed.workflowId && !retry) {
      try {
        await db.workflows.transition(claimed.userId, claimed.workflowId, "FAILED", now);
      } catch {
        log("warn", "could not mark workflow failed", { jobId, userId: claimed.userId });
      }
    }
    log("error", "job failed", {
      userId: claimed.userId,
      jobId,
      type: claimed.type,
      error: message,
    });
  }
}

async function curateReady(
  db: Database,
  llm: LLMProvider,
  userId: string,
  workflowId: string | null,
  repositoryId: string | undefined,
  now: string,
  onlyChangeId?: string,
): Promise<void> {
  const ready = onlyChangeId
    ? [await oneChange(db, userId, onlyChangeId)]
    : await db.changes.listReadyForCurator(userId, repositoryId);
  if (ready.length === 0) return;
  await move(db, userId, workflowId, "CURATING", now);
  const projects = await db.projects.list(userId);
  const repos = await db.repos.list(userId);
  for (const change of ready) {
    const analystRaw = await db.agents.latestOutput(userId, change.id, "analyst");
    if (!analystRaw) continue;
    const analyst = parseAnalystReport(analystRaw);
    const repo = repos.find((item) => item.id === change.repositoryId);
    const report = await curateWithFollowups({
      llm,
      change: {
        id: change.id,
        repositoryName: repo?.name ?? "repository",
        defaultBranch: repo?.defaultBranch ?? "main",
        fromRevision: change.fromRevision,
        toRevision: change.toRevision,
      },
      analyst,
      projects: projects.map((project) => ({
        slug: project.slug,
        name: project.name,
        description: project.description,
      })),
      maxFollowups: limits.maxCuratorFollowups,
    });
    await db.agents.complete({
      userId,
      changeEventId: change.id,
      agentName: "curator",
      outputJson: JSON.stringify(report),
      now,
    });
    const action = approvalAction(report.classification);
    if (!action || (await db.approvals.findByChange(userId, change.id))) continue;
    const target = portfolioTarget({
      action,
      projectId: null,
      projectSlug: report.projectSlug,
      projects,
    });
    await db.approvals.create({
      userId,
      projectId: target.mode === "link" ? target.project.id : null,
      changeEventId: change.id,
      workflowId,
      action: target.mode === "create" ? "NEW_PROJECT" : action,
      reason: report.reason,
      now,
    });
  }
}

async function oneChange(db: Database, userId: string, changeId: string) {
  const change = await db.changes.get(userId, changeId);
  if (!change) throw new Error("change not found");
  if (change.status !== "analyzed") throw new Error("Analyst has not finished this change");
  const analyst = await db.agents.latestOutput(userId, change.id, "analyst");
  if (!analyst) throw new Error("Analyst has not run for this change");
  return change;
}

async function move(
  db: Database,
  userId: string,
  workflowId: string | null,
  to: WorkflowState,
  now: string,
): Promise<void> {
  if (!workflowId) return;
  try {
    await db.workflows.transition(userId, workflowId, to, now);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Illegal workflow transition"))
      throw error;
  }
}

function agentHooks(db: Database, userId: string): AnalysisHooks {
  return {
    alreadyRan: (changeId, agent) => db.agents.hasCompleted(userId, changeId, agent),
    saveRun: (changeId, agent, outputJson) =>
      db.agents.complete({ userId, changeEventId: changeId, agentName: agent, outputJson }),
    markChange: () => Promise.resolve(),
  };
}

async function scoutFor(
  db: Database,
  userId: string,
  changeId: string,
  scouted: Map<string, ScoutReport>,
): Promise<ScoutReport> {
  const cached = scouted.get(changeId);
  if (cached) return cached;
  const raw = await db.agents.latestOutput(userId, changeId, "scout");
  if (!raw) throw new Error("scout output is missing");
  const report = scoutReport.parse(JSON.parse(raw));
  scouted.set(changeId, report);
  return report;
}

async function userLlm(env: Env, db: Database, userId: string): Promise<LLMProvider> {
  const config = await db.llm.get(userId);
  const cipher = await db.llm.ciphertext(userId);
  if (!config || !cipher) throw new Error("Save an LLM config before an agent can run");
  const apiKey = await decryptString(await importAesKey(env.ENCRYPTION_KEY), cipher);
  return new OpenAICompatibleProvider({ baseUrl: config.baseUrl, apiKey, model: config.model });
}

async function readFile(
  provider: GitHubProvider,
  installationId: string,
  repo: { externalId: string; name: string },
  defaultBranch: string,
  path: string,
  revision: string,
): Promise<{ path: string; content: string } | null> {
  try {
    return await provider.getFile(
      { installationId },
      { externalId: repo.externalId, name: repo.name, defaultBranch },
      path,
      revision,
    );
  } catch {
    return null;
  }
}

export async function reconcile(env: Env, now = new Date()): Promise<number> {
  const db = new Database(env.DB);
  const cutoff = new Date(now.getTime() - limits.lockTimeoutMs).toISOString();
  const stuck = await db.jobs.listStuck(cutoff);
  for (const job of stuck) {
    const failed = !shouldRetry(job.attempts, job.maxAttempts);
    await db.jobs.releaseStuck(job.id, now.toISOString(), failed, "lock expired");
    if (!failed) await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  }
  return stuck.length;
}
