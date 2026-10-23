import { Database } from "@exokortex/database";
import { encryptString, importAesKey, verifyHmacSha256 } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { storeDiscovered } from "../discover.js";
import type { AppBindings } from "../http/types.js";
import { pageOrigin } from "../auth.js";
import { enqueueScan, githubProvider } from "../jobs.js";
import { open, seal, sessionSecret } from "../session.js";

export function registerGitHubRoutes(app: Hono<AppBindings>): void {
  app.get("/api/github/install", async (c) => {
    const provider = githubProvider(c.env);
    if (!c.env.GITHUB_APP_SLUG || !provider)
      throw new AppError("github_unconfigured", "GitHub App is not configured", 503);
    const returnTo = pageOrigin(c.env, c.req.raw);
    const state = await seal(sessionSecret(c.env), {
      sub: c.get("userId"),
      returnTo,
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    });
    const url = `https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`;
    return finishInstall(c, url, null);
  });

  app.get("/api/github/callback", async (c) => {
    const installationId = c.req.query("installation_id");
    const state = c.req.query("state");
    if (!installationId || !state)
      throw new AppError("invalid_callback", "Missing installation id");
    const install = await readInstallState(c.env, state);
    if (!install) throw new AppError("invalid_callback", "Install link expired", 401);
    const stored = await saveGitHubInstallation(c.env, install.userId, installationId);
    return c.redirect(`${install.returnTo}/repositories?connected=${stored}`);
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

function finishInstall(c: { req: { header: (name: string) => string | undefined }; json: (body: unknown) => Response; redirect: (url: string) => Response }, target: string, stored: number | null): Response {
  if (stored !== null) {
    const url = `${target}/repositories?connected=${stored}`;
    if ((c.req.header("Accept") ?? "").includes("application/json")) return c.json({ url });
    return c.redirect(url);
  }
  if ((c.req.header("Accept") ?? "").includes("application/json")) return c.json({ url: target });
  return c.redirect(target);
}

async function saveGitHubInstallation(
  env: AppBindings["Bindings"],
  userId: string,
  installationId: string,
): Promise<number> {
  const provider = githubProvider(env);
  if (!provider) throw new AppError("github_unconfigured", "GitHub App is not configured", 503);
  const db = new Database(env.DB);
  const encrypted = await encryptString(
    await importAesKey(env.ENCRYPTION_KEY),
    JSON.stringify({ installationId }),
  );
  const connection = await db.connections.upsert({
    userId,
    provider: "github",
    externalInstallationId: installationId,
    encryptedCredentials: encrypted,
  });
  const stored = await storeDiscovered(db, userId, connection.id, provider, installationId);
  await enqueueScan(env, db, {
    userId,
    installationId,
    idempotencyKey: `scan:${userId}:bootstrap:${installationId}`,
  });
  return stored;
}

async function readInstallState(
  env: AppBindings["Bindings"],
  state: string,
): Promise<{ userId: string; returnTo: string } | null> {
  const payload = await open<{ sub?: string; exp?: number; returnTo?: string }>(
    sessionSecret(env),
    state,
  );
  if (!payload?.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;
  return { userId: payload.sub, returnTo: safeReturn(payload.returnTo, env.APP_BASE_URL) };
}

function safeReturn(returnTo: string | undefined, appBaseUrl: string | undefined): string {
  const fallback = appBaseUrl ?? "";
  if (!returnTo) return fallback;
  try {
    const url = new URL(returnTo);
    const local =
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (local || (appBaseUrl && url.origin === new URL(appBaseUrl).origin)) return url.origin;
  } catch {
    return fallback;
  }
  return fallback;
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
