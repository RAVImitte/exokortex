import { describe, expect, it } from "vitest";
import { curatorClassification } from "./schemas.js";
import { parseAgentOutput } from "./validate.js";

const valid = JSON.stringify({
  classification: "NEW_PROJECT",
  projectSlug: null,
  reason: "No matching portfolio project.",
  followupQuestion: null,
});

describe("parseAgentOutput", () => {
  it("accepts valid JSON on the first try", async () => {
    const result = await parseAgentOutput(curatorClassification, valid, async () => {
      throw new Error("should not retry");
    });
    expect(result.classification).toBe("NEW_PROJECT");
  });

  it("retries once and then fails closed", async () => {
    let calls = 0;
    await expect(
      parseAgentOutput(curatorClassification, "not json", async () => {
        calls += 1;
        return "still not json";
      }),
    ).rejects.toThrow(/failed validation/);
    expect(calls).toBe(1);
  });

  it("accepts the retry when the second payload is valid", async () => {
    const result = await parseAgentOutput(curatorClassification, "nope", async () => valid);
    expect(result.classification).toBe("NEW_PROJECT");
  });
});
