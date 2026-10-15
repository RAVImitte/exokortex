import { describe, expect, it } from "vitest";
import { redact } from "./index.js";

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
