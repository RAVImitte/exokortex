import { Database } from "@exokortex/database";
import { AppError } from "@exokortex/shared";
import type { MiddlewareHandler } from "hono";
import { identify } from "../auth.js";
import type { AppBindings } from "../http/types.js";
import { publicPaths } from "../http/types.js";

export const requireUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (publicPaths.has(c.req.path)) return next();
  const identity = await identify(c.env, c.req.raw);
  if (!identity) throw new AppError("unauthorized", "Sign in required", 401);
  const user = await new Database(c.env.DB).users.upsert({
    authSubject: identity.subject,
    email: identity.email,
  });
  c.set("userId", user.id);
  return next();
};
