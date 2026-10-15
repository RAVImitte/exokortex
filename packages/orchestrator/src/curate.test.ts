import type { AnalystReport } from "@exokortex/agents";
import type { LLMProvider } from "@exokortex/llm";
import { describe, expect, it } from "vitest";
import type { AnalysisChange } from "./analyze.js";
import { approvalAction, curateWithFollowups } from "./curate.js";

const change: AnalysisChange = {
  id: "chg_1",
  repositoryName: "acme/hangman",
  defaultBranch: "main",
  fromRevision: "aaa",
  toRevision: "bbb",
};

const analyst: AnalystReport = {
  purpose: "A word game.",
  architecture: "One script.",
  technologies: ["javascript"],
  relationships: [],
  evidence: [{ source: "README.md", quote: "Hangman" }],
};

function llm(replies: string[]): LLMProvider {
  return {
    async generate() {
      const next = replies.shift();
      if (!next) throw new Error("no reply left");
      return { text: next, model: "test" };
    },
  };
}

describe("curator", () => {
  it("asks the analyst once, then keeps the next classification", async () => {
    const report = await curateWithFollowups({
      llm: llm([
        JSON.stringify({
          classification: "NEW_PROJECT",
          projectSlug: null,
          reason: "Need a comparison.",
          followupQuestion: "Is this the same game already in the portfolio?",
        }),
        JSON.stringify({ answer: "No matching project is described." }),
        JSON.stringify({
          classification: "NEW_PROJECT",
          projectSlug: "hangman",
          reason: "No portfolio project matches this repository.",
          followupQuestion: null,
        }),
      ]),
      change,
      analyst,
      projects: [],
      maxFollowups: 5,
    });
    expect(report.classification).toBe("NEW_PROJECT");
    expect(report.projectSlug).toBe("hangman");
    expect(approvalAction(report.classification)).toBe("NEW_PROJECT");
  });

  it("does not create an approval for an unchanged or ignored project", () => {
    expect(approvalAction("UNCHANGED")).toBeNull();
    expect(approvalAction("IGNORE")).toBeNull();
    expect(approvalAction("UPDATED_PROJECT")).toBe("UPDATED_PROJECT");
  });
});
