import { Database } from "@exokortex/database";
import { AppError } from "@exokortex/shared";
import type { MiddlewareHandler } from "hono";
import { identify, pageOrigin } from "../auth.js";
import type { AppBindings } from "../http/types.js";
import { publicPaths } from "../http/types.js";

const installPaths = new Set(["/api/github/install", "/api/google/install"]);

export const requireUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (publicPaths.has(c.req.path)) return next();
  const identity = await identify(c.env, c.req.raw);
  if (!identity) {
    if (c.req.header("Sec-Fetch-Dest") === "document" && installPaths.has(c.req.path)) {
      const back = pageOrigin(c.env, c.req.raw);
      if (back) return c.redirect(`${back}/connections`);
    }
    throw new AppError("unauthorized", "Sign in required", 401);
  }
  const user = await new Database(c.env.DB).users.upsert({
    authSubject: identity.subject,
    email: identity.email,
  });
  c.set("userId", user.id);
  return next();
};
