import { describe, expect, it } from "vitest";
import { decryptString, encryptString, importAesKey, randomKeyBase64 } from "./crypto.js";
import { signHmacSha256, verifyHmacSha256 } from "./hmac.js";

describe("AES-GCM credentials", () => {
  it("round-trips a secret and fails closed on a bad payload", async () => {
    const key = await importAesKey(randomKeyBase64());
    const cipher = await encryptString(key, "sk-user-key");
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain("sk-user-key");
    expect(await decryptString(key, cipher)).toBe("sk-user-key");
    await expect(decryptString(key, "nope")).rejects.toThrow(/malformed/);
  });

  it("rejects a key that is not 32 bytes", async () => {
    await expect(importAesKey(btoa("short"))).rejects.toThrow(/32 bytes/);
  });
});

describe("webhook signatures", () => {
  it("accepts a matching signature and rejects a missing or wrong one", async () => {
    const body = JSON.stringify({ zen: "keep it secret" });
    const header = await signHmacSha256("hook-secret", body);
    expect(await verifyHmacSha256("hook-secret", body, header)).toBe(true);
    expect(await verifyHmacSha256("hook-secret", body, null)).toBe(false);
    expect(await verifyHmacSha256("other", body, header)).toBe(false);
  });
});
