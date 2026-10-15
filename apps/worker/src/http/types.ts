import type { Env } from "../env.js";

export type AppVars = { userId: string };

export type AppBindings = { Bindings: Env; Variables: AppVars };

export const publicPaths = new Set([
  "/api/health",
  "/api/dev/login",
  "/api/logout",
  "/api/github/callback",
  "/api/github/webhook",
]);
