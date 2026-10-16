import { describe, expect, it } from "vitest";
import { primaryEmail, redact } from "./index.js";

describe("redact", () => {
  it("hides secret-looking fields and keeps the rest", () => {
    expect(
      redact({
        userId: "user_1",
        apiKey: "sk-live",
        authorization: "Bearer abc",
        webhookSecret: "shh",
      }),
    ).toEqual({
      userId: "user_1",
      apiKey: "[redacted]",
      authorization: "[redacted]",
      webhookSecret: "[redacted]",
    });
  });
});

describe("primaryEmail", () => {
  it("prefers the primary address, then the first address, then the fallback", () => {
    const addresses = [
      { id: "a", emailAddress: "first@example.com" },
      { id: "b", emailAddress: "primary@example.com" },
    ];
    expect(primaryEmail({ fallback: "user_1", primaryId: "b", addresses })).toBe(
      "primary@example.com",
    );
    expect(primaryEmail({ fallback: "user_1", addresses })).toBe("first@example.com");
    expect(primaryEmail({ fallback: "user_1" })).toBe("user_1");
  });
});
