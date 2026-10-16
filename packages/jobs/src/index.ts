import { limits } from "@exokortex/core";

export function backoffMs(attempt: number): number {
  const base = 30_000;
  const exponent = Math.max(0, attempt - 1);
  return Math.min(base * 2 ** exponent, 6 * 60 * 60 * 1000);
}

export function nextRunIso(now: Date, attempt: number): string {
  return new Date(now.getTime() + backoffMs(attempt)).toISOString();
}

export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}

export function maxAttemptsFor(type: string): number {
  if (type === "engineer") return limits.maxEngineerAttempts;
  if (type === "analyst") return limits.analystAttempts;
  if (type === "curator") return limits.curatorAttempts;
  if (type === "scout") return limits.scoutAttempts;
  return limits.scanAttempts;
}

export function scanIdempotencyKey(userId: string, repositoryId: string, revision: string): string {
  return `scan:${userId}:${repositoryId}:${revision}`;
}

export function minuteBucket(now: Date): string {
  return now.toISOString().slice(0, 16);
}

export function manualScanKey(userId: string, now: Date, provider = "github"): string {
  const bucket = minuteBucket(now);
  if (provider === "github") return `scan:${userId}:manual:${bucket}`;
  return `scan:${userId}:manual:${provider}:${bucket}`;
}

export function scheduledScanKey(userId: string, nextScanAt: string, provider = "github"): string {
  if (provider === "github") return `scan:${userId}:scheduled:${nextScanAt}`;
  return `scan:${userId}:scheduled:${provider}:${nextScanAt}`;
}

export function forceAnalyzeKey(userId: string, changeId: string, now: Date): string {
  return `scan:${userId}:force:${changeId}:${now.toISOString()}`;
}

export function engineerKey(userId: string, approvalId: string): string {
  return `engineer:${userId}:${approvalId}`;
}

export function isLockExpired(
  lockedAt: string,
  now: Date,
  timeoutMs = limits.lockTimeoutMs,
): boolean {
  return now.getTime() - new Date(lockedAt).getTime() > timeoutMs;
}
