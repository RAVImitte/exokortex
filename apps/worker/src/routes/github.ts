import { Database } from "@exokortex/database";
import { verifyInstallationAccess } from "@exokortex/github";
import { encryptString, importAesKey, verifyHmacSha256 } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { storeDiscovered } from "../discover.js";
import type { AppBindings } from "../http/types.js";
import { pageOrigin } from "../auth.js";
import { enqueueScan, githubProvider } from "../jobs.js";
import { open, readCookie, seal, sessionSecret } from "../session.js";

const CONNECT_COOKIE = "exo_github_connect";

function connectCookie(nonce: string, secure: boolean, maxAge = 900): string {
  return `${CONNECT_COOKIE}=${nonce}; HttpOnly; SameSite=Lax; Path=/api/github; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function registerGitHubRoutes(app: Hono<AppBindings>): void {
  app.get("/api/github/install", async (c) => {
    const provider = githubProvider(c.env);
    if (
      !c.env.GITHUB_APP_SLUG ||
      !provider ||
      !c.env.GITHUB_CLIENT_ID ||
      !c.env.GITHUB_CLIENT_SECRET ||
      !c.env.APP_BASE_URL
    )
      throw new AppError("github_unconfigured", "GitHub App is not configured", 503);
    const returnTo = pageOrigin(c.env, c.req.raw);
    const nonce = crypto.randomUUID();
    c.header("Set-Cookie", connectCookie(nonce, new URL(c.req.url).protocol === "https:"));
    const state = await seal(sessionSecret(c.env), {
      purpose: "github-connect",
      stage: "install",
      nonce,
      sub: c.get("userId"),
      returnTo,
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    });
    const url = `https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`;
    if ((c.req.header("Accept") ?? "").includes("application/json")) return c.json({ url });
    return c.redirect(url);
  });

  app.get("/api/github/callback", async (c) => {
    const installationId = c.req.query("installation_id");
    const state = c.req.query("state");
    if (!state) throw new AppError("invalid_callback", "Missing connection state");
    const install = await readInstallState(c.env, state);
    if (!install || readCookie(c.req.raw, CONNECT_COOKIE) !== install.nonce) {
      throw new AppError(
        "invalid_callback",
        "Install link expired or belongs to another browser",
        401,
      );
    }
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET || !c.env.APP_BASE_URL) {
      throw new AppError("github_unconfigured", "GitHub user authorization is not configured", 503);
    }
    const redirectUri = `${c.env.APP_BASE_URL.replace(/\/$/, "")}/api/github/callback`;
    if (install.stage === "install") {
      if (!installationId || !/^\d+$/.test(installationId))
        throw new AppError("invalid_callback", "Missing installation id");
      const nextState = await seal(sessionSecret(c.env), {
        ...install,
        stage: "authorize",
        installationId,
      });
      const target = new URL("https://github.com/login/oauth/authorize");
      target.search = new URLSearchParams({
        client_id: c.env.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        state: nextState,
      }).toString();
      return c.redirect(target.toString());
    }
    const code = c.req.query("code");
    if (!code || !install.installationId)
      throw new AppError("invalid_callback", "Missing GitHub authorization code");
    try {
      await verifyInstallationAccess({
        clientId: c.env.GITHUB_CLIENT_ID,
        clientSecret: c.env.GITHUB_CLIENT_SECRET,
        code,
        redirectUri,
        installationId: install.installationId,
      });
    } catch {
      throw new AppError(
        "installation_access",
        "GitHub could not verify your access to this installation. Connect again with an account that has access.",
        403,
      );
    }
    const stored = await saveGitHubInstallation(c.env, install.sub, install.installationId);
    c.header("Set-Cookie", connectCookie("", new URL(c.req.url).protocol === "https:", 0));
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
): Promise<{
  purpose: string;
  stage: "install" | "authorize";
  sub: string;
  nonce: string;
  exp: number;
  returnTo: string;
  installationId?: string;
} | null> {
  const payload = await open<{
    purpose?: string;
    stage?: "install" | "authorize";
    sub?: string;
    nonce?: string;
    exp?: number;
    returnTo?: string;
    installationId?: string;
  }>(sessionSecret(env), state);
  if (
    payload?.purpose !== "github-connect" ||
    (payload.stage !== "install" && payload.stage !== "authorize") ||
    !payload.sub ||
    !payload.nonce ||
    !payload.exp ||
    payload.exp * 1000 < Date.now()
  )
    return null;
  return {
    ...payload,
    purpose: payload.purpose,
    stage: payload.stage,
    sub: payload.sub,
    nonce: payload.nonce,
    exp: payload.exp,
    returnTo: safeReturn(payload.returnTo, env.APP_BASE_URL),
  };
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
  for (const connection of await db.connections.listByInstallation(installationId)) {
    const repository = await db.repos.findByExternalId(
      connection.userId,
      connection.id,
      externalId,
    );
    await enqueueScan(env, db, {
      userId: connection.userId,
      installationId,
      // Unknown repositories trigger discovery before the baseline scan.
      repositoryId: repository?.id,
      idempotencyKey: `scan:${connection.userId}:${connection.id}:${externalId}:${after}`,
    });
  }
}
