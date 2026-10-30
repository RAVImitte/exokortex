import { addFrequency } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { scheduledScanKey } from "@exokortex/jobs";
import { nowIso } from "@exokortex/shared";
import type { Env, JobMessage } from "./env.js";
import { enqueueScan, isScanProvider, reconcile } from "./jobs.js";

export async function runScheduler(env: Env, now = new Date()): Promise<void> {
  await reconcile(env, now);
  const db = new Database(env.DB);
  const dueJobs = await db.jobs.listDue(nowIso(now));
  for (const job of dueJobs) {
    await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  }
  const due = await db.users.listDue(nowIso(now));
  for (const user of due) {
    const connections = (await db.connections.list(user.id)).filter(
      (connection) =>
        connection.status === "active" &&
        connection.externalInstallationId &&
        isScanProvider(connection.provider),
    );
    if (user.nextScanAt) {
      for (const connection of connections) {
        await enqueueScan(env, db, {
          userId: user.id,
          installationId: connection.externalInstallationId ?? "",
          provider: connection.provider,
          idempotencyKey: scheduledScanKey(
            user.id,
            user.nextScanAt,
            `${connection.provider}:${connection.id}`,
          ),
        });
      }
    }
    await db.users.updateSettings(user.id, {
      nextScanAt: addFrequency(now, user.scanFrequency).toISOString(),
    });
  }
}
