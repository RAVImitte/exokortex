import { Database } from "@exokortex/database";
import { GoogleProvider, googleAuthorization } from "@exokortex/google";
import { encryptString, importAesKey } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { storeDiscovered } from "../discover.js";
import type { AppBindings } from "../http/types.js";
import { enqueueScan } from "../jobs.js";
import { open, seal, sessionSecret } from "../session.js";

const SCOPE = "openid email https://www.googleapis.com/auth/drive.readonly";

export function registerGoogleRoutes(app: Hono<AppBindings>): void {
  app.get("/api/google/install", async (c) => {
    const config = googleConfig(c.env);
    if (!config) throw new AppError("google_unconfigured", "Google OAuth is not configured", 503);
    const redirectUri = callbackUrl(c.env);
    const state = await seal(sessionSecret(c.env), {
      purpose: "google-connect",
      sub: c.get("userId"),
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    const target = url.toString();
    if ((c.req.header("Accept") ?? "").includes("application/json")) return c.json({ url: target });
    return c.redirect(target);
  });

  app.get("/api/google/callback", async (c) => {
    const config = googleConfig(c.env);
    if (!config) throw new AppError("google_unconfigured", "Google OAuth is not configured", 503);
    if (c.req.query("error"))
      throw new AppError("access_denied", "Google connection was denied", 401);
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state)
      throw new AppError("invalid_callback", "Missing Google authorization code");
    const userId = await readInstallState(c.env, state);
    if (!userId) throw new AppError("invalid_callback", "Connect link expired", 401);

    let tokens: { accessToken: string; refreshToken: string };
    try {
      tokens = await googleAuthorization({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code,
        redirectUri: callbackUrl(c.env),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("returned 401") || message.includes("returned 400")) {
        throw new AppError("invalid_token", "Google rejected that connection", 401);
      }
      throw new AppError("google_unavailable", "Google could not be reached", 502);
    }

    const provider = new GoogleProvider({ accessToken: tokens.accessToken });
    const account = await provider.account();
    const db = new Database(c.env.DB);
    const encrypted = await encryptString(
      await importAesKey(c.env.ENCRYPTION_KEY),
      JSON.stringify({ refreshToken: tokens.refreshToken }),
    );
    const connection = await db.connections.upsert({
      userId,
      provider: "google",
      externalInstallationId: account.id,
      externalUserId: account.email,
      encryptedCredentials: encrypted,
    });
    const stored = await storeDiscovered(db, userId, connection.id, provider, account.id);
    await enqueueScan(c.env, db, {
      userId,
      installationId: account.id,
      provider: "google",
      idempotencyKey: `scan:${userId}:bootstrap:google:${account.id}`,
    });
    return c.redirect(`${c.env.APP_BASE_URL ?? ""}/repositories?connected=${stored}`);
  });
}

function googleConfig(
  env: AppBindings["Bindings"],
): { clientId: string; clientSecret: string } | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.APP_BASE_URL) return null;
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function callbackUrl(env: AppBindings["Bindings"]): string {
  return `${env.APP_BASE_URL}/api/google/callback`;
}

async function readInstallState(
  env: AppBindings["Bindings"],
  state: string,
): Promise<string | null> {
  const payload = await open<{ purpose?: string; sub?: string; exp?: number }>(
    sessionSecret(env),
    state,
  );
  if (
    payload?.purpose !== "google-connect" ||
    !payload.sub ||
    !payload.exp ||
    payload.exp * 1000 < Date.now()
  )
    return null;
  return payload.sub;
}
