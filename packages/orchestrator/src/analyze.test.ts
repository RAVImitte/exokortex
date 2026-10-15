import type { LLMProvider } from "@exokortex/llm";
import { describe, expect, it } from "vitest";
import {
  analyzeChange,
  runAgentPass,
  scoutChange,
  shouldAnalyzeChange,
  type AnalysisChange,
} from "./analyze.js";

const change: AnalysisChange = {
  id: "chg_1",
  repositoryName: "acme/api",
  defaultBranch: "main",
  fromRevision: "aaa",
  toRevision: "bbb",
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

describe("scout and analyst", () => {
  it("lets a forced pass continue after a noise classification", () => {
    const noise = { meaningful: false, significance: "noise" };
    expect(shouldAnalyzeChange(noise)).toBe(false);
    expect(shouldAnalyzeChange(noise, true)).toBe(true);
  });

  it("keeps a noise classification and skips a second agent when asked", async () => {
    const report = await scoutChange({
      llm: llm([
        JSON.stringify({
          meaningful: false,
          significance: "noise",
          summary: "Lockfile only.",
          evidence: [{ path: "package-lock.json", status: "modified", note: "dependency pin" }],
        }),
      ]),
      change,
      files: [{ path: "package-lock.json", status: "modified" }],
    });
    expect(report.significance).toBe("noise");

    const ran: string[] = [];
    const count = await runAgentPass({
      changes: [change],
      agent: "analyst",
      hooks: {
        alreadyRan: async () => report.significance === "noise",
        saveRun: async () => undefined,
        markChange: async () => undefined,
      },
      run: async () => {
        ran.push("analyst");
        return report;
      },
    });
    expect(count).toBe(0);
    expect(ran).toEqual([]);
  });

  it("retries once when the analyst reply is not JSON", async () => {
    const report = await analyzeChange({
      llm: llm([
        "not json",
        JSON.stringify({
          purpose: "HTTP API",
          architecture: "One service",
          technologies: ["TypeScript"],
          relationships: [],
          evidence: [{ source: "README.md", quote: "HTTP API" }],
        }),
      ]),
      change,
      scout: {
        meaningful: true,
        significance: "high",
        summary: "Added a route.",
        evidence: [],
      },
      files: [{ path: "README.md", content: "HTTP API" }],
    });
    expect(report.purpose).toBe("HTTP API");
  });
});
