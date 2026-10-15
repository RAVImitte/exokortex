import { curatorClassification } from "@exokortex/agents";
import { Database } from "@exokortex/database";
import { parseAnalystReport } from "@exokortex/orchestrator";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";

export function registerApprovalRoutes(app: Hono<AppBindings>): void {
  app.get("/api/projects", async (c) => {
    return c.json({ projects: await new Database(c.env.DB).projects.list(c.get("userId")) });
  });

  app.get("/api/approvals", async (c) => {
    return c.json({ approvals: await new Database(c.env.DB).approvals.list(c.get("userId")) });
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
    const projectId =
      body.decision === "approved" ? await applyApproval(db, userId, approval) : null;
    const resolved = await db.approvals.resolve(userId, approval.id, body.decision, projectId);
    if (!resolved) throw new AppError("not_found", "Approval not found", 404);
    if (approval.workflowId) {
      const pending = await db.approvals.listPending(userId, approval.workflowId);
      if (pending.length === 0) {
        try {
          await db.workflows.transition(userId, approval.workflowId, "COMPLETED");
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Illegal workflow transition")) {
            throw error;
          }
        }
      }
    }
    return c.json({ ok: true });
  });
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
  const curatorRaw = await db.agents.latestOutput(userId, change.id, "curator");
  const curator = curatorRaw ? curatorClassification.parse(JSON.parse(curatorRaw)) : null;
  if (approval.action === "UPDATED_PROJECT") {
    const listed = approval.projectId
      ? (await db.projects.list(userId)).find((item) => item.id === approval.projectId)
      : null;
    const project =
      listed ??
      (curator?.projectSlug ? await db.projects.findBySlug(userId, curator.projectSlug) : null);
    if (!project) {
      throw new AppError("missing_project", "No portfolio project matches this update", 409);
    }
    await db.projects.linkSource(project.id, repo.id);
    return project.id;
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
