import { Database } from "@exokortex/database";
import { encryptString, importAesKey, verifyHmacSha256 } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { storeDiscovered } from "../discover.js";
import type { AppBindings } from "../http/types.js";
import { enqueueScan, githubProvider } from "../jobs.js";
import { open, seal, sessionSecret } from "../session.js";

export function registerGitHubRoutes(app: Hono<AppBindings>): void {
  app.get("/api/github/install", async (c) => {
    if (!c.env.GITHUB_APP_SLUG)
      throw new AppError("github_unconfigured", "GitHub App is not configured", 503);
    const state = await seal(sessionSecret(c.env), {
      sub: c.get("userId"),
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    });
    const url = `https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`;
    return c.redirect(url);
  });

  app.get("/api/github/callback", async (c) => {
    const installationId = c.req.query("installation_id");
    const state = c.req.query("state");
    if (!installationId || !state)
      throw new AppError("invalid_callback", "Missing installation id");
    const userId = await readInstallState(c.env, state);
    if (!userId) throw new AppError("invalid_callback", "Install link expired", 401);
    const provider = githubProvider(c.env);
    if (!provider) throw new AppError("github_unconfigured", "GitHub App is not configured", 503);

    const db = new Database(c.env.DB);
    const encrypted = await encryptString(
      await importAesKey(c.env.ENCRYPTION_KEY),
      JSON.stringify({ installationId }),
    );
    const connection = await db.connections.upsert({
      userId,
      provider: "github",
      externalInstallationId: installationId,
      encryptedCredentials: encrypted,
    });
    const stored = await storeDiscovered(db, userId, connection.id, provider, installationId);
    await enqueueScan(c.env, db, {
      userId,
      installationId,
      idempotencyKey: `scan:${userId}:bootstrap:${installationId}`,
    });
    return c.redirect(`${c.env.APP_BASE_URL ?? ""}/repositories?connected=${stored}`);
  });

  app.post("/api/github/webhook", async (c) => {
    const body = await c.req.text();
    const valid = await verifyHmacSha256(
      c.env.GITHUB_WEBHOOK_SECRET ?? "",
      body,
      c.req.header("x-hub-signature-256") ?? null,
    );
    if (!c.env.GITHUB_WEBHOOK_SECRET || !valid) {
      throw new AppError("invalid_signature", "Invalid webhook signature", 401);
    }
    const event = c.req.header("x-github-event");
    const payload = JSON.parse(body) as {
      installation?: { id?: number };
      repository?: { id?: number };
      after?: string;
    };
    if (event === "push" && payload.installation?.id && payload.repository?.id && payload.after) {
      await enqueuePush(
        c.env,
        String(payload.installation.id),
        String(payload.repository.id),
        payload.after,
      );
    }
    return c.json({ ok: true });
  });

  app.get("/api/connections", async (c) => {
    const connections = await new Database(c.env.DB).connections.list(c.get("userId"));
    return c.json({
      connections: connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        externalUserId: connection.externalUserId,
        externalInstallationId: connection.externalInstallationId,
      })),
    });
  });

  app.delete("/api/connections/:id", async (c) => {
    const ok = await new Database(c.env.DB).connections.disconnect(
      c.get("userId"),
      c.req.param("id"),
    );
    if (!ok) throw new AppError("not_found", "Connection not found", 404);
    return c.json({ ok: true });
  });
}

async function readInstallState(
  env: AppBindings["Bindings"],
  state: string,
): Promise<string | null> {
  const payload = await open<{ sub?: string; exp?: number }>(sessionSecret(env), state);
  if (!payload?.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload.sub;
}

async function enqueuePush(
  env: AppBindings["Bindings"],
  installationId: string,
  externalId: string,
  after: string,
) {
  const db = new Database(env.DB);
  const connection = await db.connections.findByInstallation(installationId);
  const repository = await db.repos.findByExternalId(externalId);
  if (!connection?.externalInstallationId || !repository || repository.userId !== connection.userId)
    return;
  await enqueueScan(env, db, {
    userId: repository.userId,
    installationId: connection.externalInstallationId,
    repositoryId: repository.id,
    idempotencyKey: `scan:${repository.userId}:${repository.id}:${after}`,
  });
}
