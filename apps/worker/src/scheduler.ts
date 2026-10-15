import { addFrequency } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { nowIso } from "@exokortex/shared";
import type { Env } from "./env.js";
import { enqueueScan, reconcile } from "./jobs.js";

export async function runScheduler(env: Env, now = new Date()): Promise<void> {
  await reconcile(env, now);
  const db = new Database(env.DB);
  const due = await db.users.listDue(nowIso(now));
  for (const user of due) {
    const connections = await db.connections.list(user.id);
    const github = connections.find(
      (connection) => connection.provider === "github" && connection.status === "active",
    );
    if (github?.externalInstallationId && user.nextScanAt) {
      await enqueueScan(env, db, {
        userId: user.id,
        installationId: github.externalInstallationId,
        idempotencyKey: `scan:${user.id}:scheduled:${user.nextScanAt}`,
      });
    }
    await db.users.updateSettings(user.id, {
      nextScanAt: addFrequency(now, user.scanFrequency).toISOString(),
    });
  }
}
