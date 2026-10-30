import { curatorClassification } from "@exokortex/agents";
import { addFrequency, isRepositoryRole } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { forceAnalyzeKey, manualScanKey } from "@exokortex/jobs";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { ensurePortfolioProfile } from "../engineer.js";
import type { AppBindings } from "../http/types.js";
import { enqueueCurate, enqueueScan, githubProvider, isScanProvider } from "../jobs.js";

function isBranchName(value: string): boolean {
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(value)) return false;
  return (
    !value.startsWith("/") && !value.endsWith("/") && !value.includes("//") && !value.includes("..")
  );
}

export function registerRepositoryRoutes(app: Hono<AppBindings>): void {
  app.get("/api/repositories", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const repositories = await db.repos.list(userId);
    const connections = await db.connections.list(userId);
    const providers = new Map(
      connections.map((connection) => [connection.id, connection.provider]),
    );
    return c.json({
      repositories: repositories.map((repo) => ({
        ...repo,
        provider: providers.get(repo.connectionId) ?? "github",
      })),
    });
  });

  app.patch("/api/repositories/:id", async (c) => {
    const body = await c.req.json<{ role?: string; defaultBranch?: string }>();
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    if (typeof body.defaultBranch === "string") {
      const branch = body.defaultBranch.trim();
      if (!isBranchName(branch)) {
        throw new AppError("invalid_branch", "Enter a branch name such as v2", 400);
      }
      const current = await db.repos.find(userId, c.req.param("id"));
      if (!current || current.role !== "PORTFOLIO") {
        throw new AppError(
          "not_portfolio",
          "Set the deploy branch on the portfolio repository",
          409,
        );
      }
      const updated = await db.repos.setDefaultBranch(userId, current.id, branch);
      if (!updated) throw new AppError("not_found", "Repository not found", 404);
      if (current.defaultBranch !== branch) {
        await db.profiles.remove(userId, updated.id);
        await ensurePortfolioProfile(db, githubProvider(c.env), userId, updated.id);
      }
      return c.json(updated);
    }
    if (!body.role || !isRepositoryRole(body.role)) {
      throw new AppError("invalid_role", "Role must be SOURCE, PORTFOLIO, or EXCLUDED");
    }
    if (body.role === "PORTFOLIO") {
      const current = await db.repos.find(userId, c.req.param("id"));
      const connection = current
        ? await db.connections.findOwned(userId, current.connectionId)
        : null;
      if (connection?.provider !== "github") {
        throw new AppError("not_github", "The portfolio repository has to be on GitHub", 409);
      }
    }
    const updated = await db.repos.setRole(userId, c.req.param("id"), body.role);
    if (!updated) throw new AppError("not_found", "Repository not found", 404);
    if (updated.role === "PORTFOLIO") {
      await ensurePortfolioProfile(db, githubProvider(c.env), userId, updated.id);
    }
    return c.json(updated);
  });

  app.post("/api/scans", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const connected = (await db.connections.list(userId)).filter(
      (connection) =>
        connection.status === "active" &&
        connection.externalInstallationId &&
        isScanProvider(connection.provider),
    );
    if (connected.length === 0) {
      throw new AppError("not_connected", "Connect GitHub or Hugging Face before scanning", 409);
    }
    const now = new Date();
    const scans = [];
    for (const connection of connected) {
      scans.push(
        await enqueueScan(c.env, db, {
          userId,
          installationId: connection.externalInstallationId ?? "",
          provider: connection.provider,
          idempotencyKey: manualScanKey(userId, now, `${connection.provider}:${connection.id}`),
        }),
      );
    }
    const user = await db.users.find(userId);
    if (user && !user.nextScanAt) {
      await db.users.updateSettings(user.id, {
        nextScanAt: addFrequency(now, user.scanFrequency).toISOString(),
      });
    }
    return c.json({ scans }, 202);
  });

  app.get("/api/changes", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const changes = await db.changes.list(userId);
    const repos = await db.repos.list(userId);
    const rows = await Promise.all(
      changes.map(async (change) => {
        const raw = await db.agents.latestOutput(userId, change.id, "curator");
        let classification: string | null = null;
        if (raw) {
          const parsed = curatorClassification.safeParse(JSON.parse(raw));
          classification = parsed.success ? parsed.data.classification : null;
        }
        return {
          ...change,
          repositoryName: repos.find((repo) => repo.id === change.repositoryId)?.name ?? "",
          classification,
        };
      }),
    );
    return c.json({ changes: rows });
  });

  app.post("/api/changes/:id/curate", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const change = await db.changes.get(userId, c.req.param("id"));
    if (!change) throw new AppError("not_found", "Change not found", 404);
    if (change.status !== "analyzed") {
      throw new AppError("not_analyzed", "Analyst must finish before Curator can run", 409);
    }
    const analyst = await db.agents.latestOutput(userId, change.id, "analyst");
    if (!analyst) {
      throw new AppError("not_analyzed", "Analyst must finish before Curator can run", 409);
    }
    const result = await enqueueCurate(c.env, db, {
      userId,
      changeId: change.id,
      idempotencyKey: `curate:${userId}:${change.id}:${new Date().toISOString()}`,
    });
    return c.json(result, 202);
  });

  app.post("/api/changes/:id/analyze", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const change = await db.changes.get(userId, c.req.param("id"));
    if (!change) throw new AppError("not_found", "Change not found", 404);
    const ignored = change.status === "ignored";
    const openNoise = change.status === "open" && change.significance === "noise";
    if (!ignored && !openNoise) {
      throw new AppError("not_ignored", "Only a noise change can be sent to Analyst", 409);
    }
    const repo = await db.repos.find(userId, change.repositoryId);
    if (!repo) throw new AppError("not_found", "Repository not found", 404);
    const connection = (await db.connections.list(userId)).find(
      (item) => item.id === repo.connectionId && item.status === "active",
    );
    if (!connection?.externalInstallationId) {
      throw new AppError("not_connected", "Reconnect this source before analyzing", 409);
    }
    if (ignored) {
      const reopened = await db.changes.reopen(userId, change.id);
      if (!reopened) {
        throw new AppError("not_ignored", "Only a noise change can be sent to Analyst", 409);
      }
    }
    const result = await enqueueScan(c.env, db, {
      userId,
      installationId: connection.externalInstallationId,
      provider: connection.provider,
      repositoryId: repo.id,
      forceAnalyze: true,
      idempotencyKey: forceAnalyzeKey(userId, change.id, new Date()),
    });
    return c.json(result, 202);
  });
}
