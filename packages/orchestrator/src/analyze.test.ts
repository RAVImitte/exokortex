import type { LLMProvider } from "@exokortex/llm";
import { describe, expect, it } from "vitest";
import {
  analyzeChange,
  analystPaths,
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
  it("replays failed status updates from saved output without another model call", async () => {
    let saved: string | null = null;
    let modelCalls = 0;
    let effectCalls = 0;
    const pass = {
      changes: [change],
      agent: "analyst" as const,
      hooks: {
        alreadyRan: async () => saved !== null,
        loadRun: async () => saved,
        saveRun: async (_id: string, _agent: string, output: string) => {
          saved = output;
        },
        markChange: async () => undefined,
      },
      run: async () => {
        modelCalls++;
        return { purpose: "API" };
      },
      after: async (_change: AnalysisChange, report: { purpose: string }) => {
        expect(report.purpose).toBe("API");
        if (++effectCalls === 1) throw new Error("D1 unavailable");
      },
    };
    await expect(runAgentPass(pass)).rejects.toThrow("D1 unavailable");
    await runAgentPass(pass);
    expect(modelCalls).toBe(1);
    expect(effectCalls).toBe(2);
  });

  it("includes notebook and script source in analyst context", () => {
    const paths = analystPaths([
      { path: "train.ipynb", status: "modified" },
      { path: "train.py", status: "modified" },
      { path: "deleted.ipynb", status: "removed" },
    ]);
    expect(paths).toContain("train.ipynb");
    expect(paths).toContain("train.py");
    expect(paths).not.toContain("deleted.ipynb");
  });
  it("sends notebook cell source without execution output to Analyst", async () => {
    let prompt = "";
    await analyzeChange({
      change,
      scout: { meaningful: true, significance: "high", summary: "Notebook change", evidence: [] },
      files: [
        {
          path: "train.ipynb",
          content: JSON.stringify({
            cells: [{ source: ["train_model()"], outputs: [{ text: "LARGE_EXECUTION_OUTPUT" }] }],
          }),
        },
      ],
      llm: {
        generate: async (request) => {
          prompt = request.user;
          return {
            text: JSON.stringify({
              purpose: "Training",
              architecture: "Notebook",
              technologies: [],
              relationships: [],
              evidence: [],
            }),
            model: "test",
          };
        },
      },
    });
    expect(prompt).toContain("train_model()");
    expect(prompt).not.toContain("LARGE_EXECUTION_OUTPUT");
  });
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
