import { Database } from "@exokortex/database";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";
import { clearCookie, seal, sessionCookie, sessionSecret } from "../session.js";

export function registerSessionRoutes(app: Hono<AppBindings>): void {
  app.get("/api/health", (c) =>
    c.json({ ok: true, authMode: c.env.AUTH_MODE, environment: c.env.ENVIRONMENT }),
  );

  app.post("/api/dev/login", async (c) => {
    if (c.env.AUTH_MODE !== "dev" || c.env.ENVIRONMENT !== "development") {
      throw new AppError("forbidden", "Dev login is disabled", 403);
    }
    const body = await c.req.json<{ email?: string }>();
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new AppError("invalid_email", "Enter a valid email");
    const user = await new Database(c.env.DB).users.upsert({ authSubject: `dev:${email}`, email });
    const token = await seal(sessionSecret(c.env), {
      sub: user.authSubject,
      email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    });
    c.header("Set-Cookie", sessionCookie(token, 60 * 60 * 24 * 14));
    return c.json({ id: user.id, email: user.email });
  });

  app.post("/api/logout", (c) => {
    c.header("Set-Cookie", clearCookie());
    return c.json({ ok: true });
  });
}
