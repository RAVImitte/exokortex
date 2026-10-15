import { addFrequency, isScanFrequency } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";
import { clearCookie } from "../session.js";

export function registerAccountRoutes(app: Hono<AppBindings>): void {
  app.get("/api/me", async (c) => {
    const user = await new Database(c.env.DB).users.find(c.get("userId"));
    if (!user) throw new AppError("unauthorized", "Sign in required", 401);
    return c.json({
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      scanFrequency: user.scanFrequency,
      nextScanAt: user.nextScanAt,
    });
  });

  app.get("/api/dashboard", async (c) => {
    return c.json(await new Database(c.env.DB).dashboard.snapshot(c.get("userId")));
  });

  app.get("/api/activity", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    return c.json({
      changes: await db.changes.list(userId),
      audit: await db.audit.list(userId),
    });
  });

  app.patch("/api/settings", async (c) => {
    const body = await c.req.json<{ timezone?: string; scanFrequency?: string }>();
    if (body.scanFrequency && !isScanFrequency(body.scanFrequency)) {
      throw new AppError("invalid_frequency", "Frequency must be weekly, biweekly, or monthly");
    }
    const db = new Database(c.env.DB);
    const user = await db.users.find(c.get("userId"));
    if (!user) throw new AppError("unauthorized", "Sign in required", 401);
    const frequency = body.scanFrequency ?? user.scanFrequency;
    const scanFrequency = isScanFrequency(frequency) ? frequency : user.scanFrequency;
    await db.users.updateSettings(user.id, {
      timezone: body.timezone,
      scanFrequency,
      nextScanAt: user.nextScanAt
        ? addFrequency(new Date(), scanFrequency).toISOString()
        : user.nextScanAt,
    });
    return c.json({ ok: true });
  });

  app.delete("/api/account", async (c) => {
    await new Database(c.env.DB).users.delete(c.get("userId"));
    c.header("Set-Cookie", clearCookie());
    return c.json({ ok: true });
  });
}
