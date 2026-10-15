import { log } from "@exokortex/shared";
import { createApp } from "./app.js";
import type { Env, JobMessage } from "./env.js";
import { handleJob } from "./jobs.js";
import { runScheduler } from "./scheduler.js";

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runScheduler(env).catch((error: unknown) => {
        log("error", error instanceof Error ? error.message : "scheduler failed");
      }),
    );
  },
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await handleJob(env, message.body.jobId);
        message.ack();
      } catch (error) {
        log("error", error instanceof Error ? error.message : "job delivery failed", {
          jobId: message.body.jobId,
        });
        message.retry();
      }
    }
  },
};
