import type { Database } from "@exokortex/database";
import type { Notice } from "@exokortex/orchestrator";
import { log } from "@exokortex/shared";
import type { Env } from "./env.js";

export async function notify(
  env: Env,
  db: Database,
  userId: string,
  notice: Notice,
): Promise<void> {
  const user = await db.users.find(userId);
  if (!user?.email || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    log("info", "email skipped", { userId });
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [user.email],
        subject: notice.subject,
        text: notice.text,
      }),
    });
    if (!response.ok) log("error", "email failed", { userId, status: response.status });
  } catch (error) {
    log("error", "email failed", {
      userId,
      error: error instanceof Error ? error.message : "send failed",
    });
  }
}

export function approvalsUrl(env: Env): string {
  const base = (env.APP_BASE_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/approvals` : "/approvals";
}
