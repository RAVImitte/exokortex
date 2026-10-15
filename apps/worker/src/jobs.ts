import { limits } from "@exokortex/core";
import { Database } from "@exokortex/database";
import { GitHubProvider } from "@exokortex/github";
import { maxAttemptsFor, nextRunIso, shouldRetry } from "@exokortex/jobs";
import { runUserScan } from "@exokortex/orchestrator";
import { log, nowIso } from "@exokortex/shared";
import type { Env, JobMessage } from "./env.js";

export function githubProvider(env: Env): GitHubProvider | null {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) return null;
  return new GitHubProvider({
    appId: env.GITHUB_APP_ID,
    privateKeyPem: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
}

export async function enqueueScan(
  env: Env,
  db: Database,
  input: { userId: string; installationId: string; repositoryId?: string; idempotencyKey: string },
): Promise<{ created: boolean; jobId: string }> {
  const now = nowIso();
  const { job, created } = await db.jobs.insert({
    userId: input.userId,
    type: "scan",
    payload: { installationId: input.installationId, repositoryId: input.repositoryId },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: maxAttemptsFor("scan"),
    now,
  });
  if (!created) return { created: false, jobId: job.id };
  const workflow = await db.workflows.create(input.userId, "SCAN_PENDING", now);
  await db.jobs.attachWorkflow(job.id, workflow.id);
  await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  return { created: true, jobId: job.id };
}

export async function handleJob(env: Env, jobId: string): Promise<void> {
  const db = new Database(env.DB);
  const now = nowIso();
  const claimed = await db.jobs.claim(jobId, now);
  if (!claimed) return;
  try {
    if (claimed.type !== "scan") throw new Error(`unsupported job type ${claimed.type}`);
    const payload = JSON.parse(claimed.payloadJson) as {
      installationId?: string;
      repositoryId?: string;
    };
    if (!payload.installationId) throw new Error("scan job is missing an installation id");
    const provider = githubProvider(env);
    if (!provider) throw new Error("GitHub App is not configured");
    if (claimed.workflowId) {
      try {
        await db.workflows.transition(claimed.userId, claimed.workflowId, "SCANNING", now);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Illegal workflow transition"))
          throw error;
      }
    }
    const summary = await runUserScan({
      db,
      provider,
      userId: claimed.userId,
      installationId: payload.installationId,
      repositoryId: payload.repositoryId,
      now,
    });
    if (claimed.workflowId) {
      await db.workflows.transition(claimed.userId, claimed.workflowId, "COMPLETED", now);
    }
    await db.jobs.complete(jobId, now);
    log("info", "scan completed", { userId: claimed.userId, jobId, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "scan failed";
    const retry = shouldRetry(claimed.attempts, claimed.maxAttempts);
    await db.jobs.fail(
      jobId,
      message,
      retry ? nextRunIso(new Date(), claimed.attempts) : null,
      now,
    );
    if (claimed.workflowId && !retry) {
      try {
        await db.workflows.transition(claimed.userId, claimed.workflowId, "FAILED", now);
      } catch {
        log("warn", "could not mark workflow failed", { jobId, userId: claimed.userId });
      }
    }
    log("error", "scan failed", { userId: claimed.userId, jobId, error: message });
  }
}

export async function reconcile(env: Env, now = new Date()): Promise<number> {
  const db = new Database(env.DB);
  const cutoff = new Date(now.getTime() - limits.lockTimeoutMs).toISOString();
  const stuck = await db.jobs.listStuck(cutoff);
  for (const job of stuck) {
    const failed = !shouldRetry(job.attempts, job.maxAttempts);
    await db.jobs.releaseStuck(job.id, now.toISOString(), failed, "lock expired");
    if (!failed) await env.JOBS.send({ jobId: job.id } satisfies JobMessage);
  }
  return stuck.length;
}
