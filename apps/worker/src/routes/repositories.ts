import { addFrequency, isRepositoryRole } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { manualScanKey } from "@exokortex/jobs";
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
}
