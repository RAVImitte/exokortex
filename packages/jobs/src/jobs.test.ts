import { describe, expect, it } from "vitest";
import {
  backoffMs,
  engineerKey,
  isLockExpired,
  manualScanKey,
  scanIdempotencyKey,
  shouldRetry,
} from "./index.js";

describe("retry policy", () => {
  it("backs off exponentially and then stops", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(shouldRetry(2, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
  });
});

describe("idempotency keys", () => {
  it("is stable for the same revision and the same minute", () => {
    expect(scanIdempotencyKey("u", "r", "abc")).toBe("scan:u:r:abc");
    expect(engineerKey("u", "apr_1")).toBe("engineer:u:apr_1");
    const now = new Date("2026-10-16T02:49:40.000Z");
    expect(manualScanKey("u", now)).toBe(manualScanKey("u", new Date("2026-10-16T02:49:59.000Z")));
    expect(manualScanKey("u", now)).not.toBe(
      manualScanKey("u", new Date("2026-10-16T02:50:00.000Z")),
    );
  });

  it("treats a lock as expired only after the timeout", () => {
    const lockedAt = "2026-10-16T02:00:00.000Z";
    expect(isLockExpired(lockedAt, new Date("2026-10-16T02:10:00.000Z"))).toBe(false);
    expect(isLockExpired(lockedAt, new Date("2026-10-16T02:16:00.000Z"))).toBe(true);
  });
});
