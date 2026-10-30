import { curatorClassification } from "@exokortex/agents";
import { Database } from "@exokortex/database";
import { explainGitHubWriteError } from "@exokortex/github";
import { engineerKey } from "@exokortex/jobs";
import { approvalFollowUp, parseAnalystReport, portfolioTarget } from "@exokortex/orchestrator";
import { AppError, nowIso } from "@exokortex/shared";
import type { Context, Hono } from "hono";
import type { AppBindings } from "../http/types.js";
import { enqueueEngineer } from "../jobs.js";
import { portfolioInstallation } from "../engineer.js";

export function registerApprovalRoutes(app: Hono<AppBindings>): void {
  app.get("/api/projects", async (c) => {
    return c.json({ projects: await new Database(c.env.DB).projects.list(c.get("userId")) });
  });

  app.get("/api/approvals", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const approvals = await db.approvals.list(userId);
    const jobs = await db.jobs.listByType(userId, "engineer");
    return c.json({
      approvals: approvals.map((approval) => {
        const job = jobs.find((item) => item.idempotencyKey === engineerKey(userId, approval.id));
        return {
          ...approval,
          engineerStatus: job?.status ?? null,
          engineerError: job?.lastError ? explainGitHubWriteError(job.lastError) : null,
        };
      }),
    });
  });

  app.post("/api/approvals/:id/retry", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const approval = await db.approvals.get(userId, c.req.param("id"));
    if (!approval || approval.status !== "approved" || approval.pullRequestUrl) {
      throw new AppError("not_found", "Approval not found", 404);
    }
    const job = await db.jobs.listByType(userId, "engineer");
    const engineer = job.find((item) => item.idempotencyKey === engineerKey(userId, approval.id));
    if (!engineer) throw new AppError("not_found", "Engineer job not found", 404);
    const requeued = await db.jobs.requeue(userId, engineer.id, nowIso());
    if (!requeued) throw new AppError("busy", "The pull request is already being opened", 409);
    await c.env.JOBS.send({ jobId: engineer.id });
    return c.json({ ok: true }, 202);
  });

  app.post("/api/approvals/:id/resolve", async (c) => {
    const body = await c.req.json<{ decision?: string }>();
    if (body.decision !== "approved" && body.decision !== "rejected") {
      throw new AppError("invalid_decision", "Decision must be approved or rejected");
    }
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const approval = await db.approvals.get(userId, c.req.param("id"));
    if (!approval || approval.status !== "pending") {
      throw new AppError("not_found", "Approval not found", 404);
    }
    const pendingBefore = approval.workflowId
      ? await db.approvals.listPending(userId, approval.workflowId)
      : [];
    const alreadyApproved = approval.workflowId
      ? await db.approvals.listApprovedWithoutPullRequest(userId, approval.workflowId)
      : [];
    const isLast = pendingBefore.length <= 1;
    const willEngineer = isLast && (body.decision === "approved" || alreadyApproved.length > 0);
    const installationId = willEngineer ? await portfolioInstallation(db, userId) : null;
    const projectId =
      body.decision === "approved" ? await applyApproval(db, userId, approval) : null;
    const resolved = await db.approvals.resolve(userId, approval.id, body.decision, projectId);
    if (!resolved) throw new AppError("not_found", "Approval not found", 404);
    if (!approval.workflowId) {
      if (body.decision === "approved" && installationId) {
        const queued = await enqueueEngineer(db, {
          userId,
          workflowId: null,
          approvalId: approval.id,
          installationId,
        });
        if (queued.created) await c.env.JOBS.send({ jobId: queued.jobId });
      }
      return c.json({ ok: true });
    }
    return continueWorkflow(c, db, userId, approval.workflowId);
  });
}

async function continueWorkflow(
  c: Context<AppBindings>,
  db: Database,
  userId: string,
  workflowId: string,
): Promise<Response> {
  const pending = await db.approvals.listPending(userId, workflowId);
  const approved = await db.approvals.listApprovedWithoutPullRequest(userId, workflowId);
  const followUp = approvalFollowUp({
    pendingLeft: pending.length,
    approvedWithoutPullRequest: approved.length,
  });
  if (followUp === "wait") return c.json({ ok: true });
  if (followUp === "complete") {
    await finishWorkflow(db, userId, workflowId, "COMPLETED");
    return c.json({ ok: true });
  }
  const installationId = await portfolioInstallation(db, userId);
  await finishWorkflow(db, userId, workflowId, "ENGINEERING");
  const queued = [];
  for (const item of approved) {
    queued.push(
      await enqueueEngineer(db, {
        userId,
        workflowId,
        approvalId: item.id,
        installationId,
      }),
    );
  }
  for (const job of queued) {
    if (job.created) await c.env.JOBS.send({ jobId: job.jobId });
  }
  return c.json({ ok: true });
}

async function finishWorkflow(
  db: Database,
  userId: string,
  workflowId: string,
  to: "COMPLETED" | "ENGINEERING",
): Promise<void> {
  try {
    await db.workflows.transition(userId, workflowId, to);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Illegal workflow transition")) {
      throw error;
    }
  }
}

async function applyApproval(
  db: Database,
  userId: string,
  approval: {
    id: string;
    projectId: string | null;
    changeEventId: string | null;
    action: string;
  },
): Promise<string | null> {
  if (!approval.changeEventId) return approval.projectId;
  const change = await db.changes.get(userId, approval.changeEventId);
  if (!change) throw new AppError("not_found", "Change not found", 404);
  const repo = await db.repos.find(userId, change.repositoryId);
  if (!repo) throw new AppError("not_found", "Repository not found", 404);
  const projects = await db.projects.list(userId);
  const curatorRaw = await db.agents.latestOutput(userId, change.id, "curator");
  const curator = curatorRaw ? curatorClassification.parse(JSON.parse(curatorRaw)) : null;
  const target = portfolioTarget({
    action: approval.action === "UPDATED_PROJECT" ? "UPDATED_PROJECT" : "NEW_PROJECT",
    projectId: approval.projectId,
    projectSlug: curator?.projectSlug ?? null,
    projects,
  });
  if (target.mode === "link") {
    await db.projects.linkSource(target.project.id, repo.id);
    return target.project.id;
  }
  const analystRaw = await db.agents.latestOutput(userId, change.id, "analyst");
  const analyst = analystRaw ? parseAnalystReport(analystRaw) : null;
  const slug = curator?.projectSlug || slugify(repo.name);
  const project = await db.projects.create({
    userId,
    slug,
    name: repo.name.split("/").pop() ?? repo.name,
    description: analyst?.purpose ?? change.summary,
    technologies: analyst?.technologies ?? [],
  });
  await db.projects.linkSource(project.id, repo.id);
  return project.id;
}

function slugify(value: string): string {
  const leaf = value.split("/").pop() ?? value;
  const slug = leaf
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.slice(0, 80) || "project";
}
