import { addFrequency, isRepositoryRole } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { forceAnalyzeKey, manualScanKey } from "@exokortex/jobs";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";
import { enqueueScan } from "../jobs.js";

export function registerRepositoryRoutes(app: Hono<AppBindings>): void {
  app.get("/api/repositories", async (c) => {
    const repositories = await new Database(c.env.DB).repos.list(c.get("userId"));
    return c.json({ repositories });
  });

  app.patch("/api/repositories/:id", async (c) => {
    const body = await c.req.json<{ role?: string }>();
    if (!body.role || !isRepositoryRole(body.role)) {
      throw new AppError("invalid_role", "Role must be SOURCE, PORTFOLIO, or EXCLUDED");
    }
    const updated = await new Database(c.env.DB).repos.setRole(
      c.get("userId"),
      c.req.param("id"),
      body.role,
    );
    if (!updated) throw new AppError("not_found", "Repository not found", 404);
    return c.json(updated);
  });

  app.post("/api/scans", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const github = (await db.connections.list(userId)).find(
      (connection) => connection.provider === "github" && connection.status === "active",
    );
    if (!github?.externalInstallationId) {
      throw new AppError("not_connected", "Connect GitHub before scanning", 409);
    }
    const now = new Date();
    const result = await enqueueScan(c.env, db, {
      userId,
      installationId: github.externalInstallationId,
      idempotencyKey: manualScanKey(userId, now),
    });
    const user = await db.users.find(userId);
    if (user && !user.nextScanAt) {
      await db.users.updateSettings(user.id, {
        nextScanAt: addFrequency(now, user.scanFrequency).toISOString(),
      });
    }
    return c.json(result, 202);
  });

  app.get("/api/changes", async (c) => {
    return c.json({ changes: await new Database(c.env.DB).changes.list(c.get("userId")) });
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
    const github = (await db.connections.list(userId)).find(
      (connection) => connection.id === repo.connectionId && connection.status === "active",
    );
    if (!github?.externalInstallationId) {
      throw new AppError("not_connected", "Connect GitHub before analyzing", 409);
    }
    if (ignored) {
      const reopened = await db.changes.reopen(userId, change.id);
      if (!reopened) {
        throw new AppError("not_ignored", "Only a noise change can be sent to Analyst", 409);
      }
    }
    const result = await enqueueScan(c.env, db, {
      userId,
      installationId: github.externalInstallationId,
      repositoryId: repo.id,
      forceAnalyze: true,
      idempotencyKey: forceAnalyzeKey(userId, change.id, new Date()),
    });
    return c.json(result, 202);
  });
}
