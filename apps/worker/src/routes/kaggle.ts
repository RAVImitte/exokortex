import { Database } from "@exokortex/database";
import { KaggleProvider } from "@exokortex/kaggle";
import { encryptString, importAesKey } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import { storeDiscovered } from "../discover.js";
import type { AppBindings } from "../http/types.js";
import { enqueueScan } from "../jobs.js";

export function registerKaggleRoutes(app: Hono<AppBindings>): void {
  app.post("/api/kaggle/connect", async (c) => {
    const body = await c.req.json<{ token?: string }>();
    const token = body.token?.trim() ?? "";
    if (token.length < 8 || token.length > 512 || /\s/.test(token)) {
      throw new AppError("invalid_token", "Paste a Kaggle API token", 400);
    }
    const provider = new KaggleProvider({ token });
    let username: string;
    try {
      username = (await provider.whoami()).username;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("returned 401") || message.includes("returned 403")) {
        throw new AppError("invalid_token", "Kaggle rejected that token", 401);
      }
      throw new AppError("kaggle_unavailable", "Kaggle could not be reached", 502);
    }

    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const encrypted = await encryptString(
      await importAesKey(c.env.ENCRYPTION_KEY),
      JSON.stringify({ token }),
    );
    const connection = await db.connections.upsert({
      userId,
      provider: "kaggle",
      externalInstallationId: username,
      externalUserId: username,
      encryptedCredentials: encrypted,
    });
    const stored = await storeDiscovered(db, userId, connection.id, provider, username);
    await enqueueScan(c.env, db, {
      userId,
      installationId: username,
      provider: "kaggle",
      idempotencyKey: `scan:${userId}:bootstrap:kaggle:${username}`,
    });
    return c.json({ username, repositories: stored });
  });
}
