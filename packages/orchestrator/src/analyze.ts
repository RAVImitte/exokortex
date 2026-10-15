import {
  analystPrompt,
  analystReport,
  parseAgentOutput,
  scoutPrompt,
  scoutReport,
} from "@exokortex/agents";
import type { AnalystReport, ScoutReport } from "@exokortex/agents";
import type { LLMProvider } from "@exokortex/llm";
import type { RepositoryChange } from "@exokortex/source-providers";

const FILE_LIMIT = 30;
const TEXT_LIMIT = 6_000;

export const analystContextFiles = ["README.md", "package.json", "pyproject.toml", "Cargo.toml"];

export interface AnalysisChange {
  id: string;
  repositoryName: string;
  defaultBranch: string;
  fromRevision: string;
  toRevision: string;
}

export interface AnalysisHooks {
  alreadyRan: (changeId: string, agent: "scout" | "analyst") => Promise<boolean>;
  saveRun: (changeId: string, agent: "scout" | "analyst", outputJson: string) => Promise<void>;
  markChange: (
    changeId: string,
    input: { summary: string; significance: string; status: "analyzed" | "ignored" },
  ) => Promise<void>;
}

export async function scoutChange(input: {
  llm: LLMProvider;
  change: AnalysisChange;
  files: RepositoryChange[];
}): Promise<ScoutReport> {
  const listing = input.files
    .slice(0, FILE_LIMIT)
    .map((file) => `${file.status} ${file.path}`)
    .join("\n");
  const user = [
    `Repository: ${input.change.repositoryName}`,
    `Revisions: ${input.change.fromRevision} -> ${input.change.toRevision}`,
    "Changed files:",
    listing || "(none listed)",
    'Reply with JSON: {"meaningful":boolean,"significance":"noise"|"low"|"high","summary":string,"evidence":[{"path":string,"status":string,"note":string}]}',
  ].join("\n");
  return ask(input.llm, scoutPrompt, user, scoutReport);
}

export async function analyzeChange(input: {
  llm: LLMProvider;
  change: AnalysisChange;
  scout: ScoutReport;
  files: { path: string; content: string }[];
}): Promise<AnalystReport> {
  const excerpts = input.files
    .map((file) => `## ${file.path}\n${file.content.slice(0, TEXT_LIMIT)}`)
    .join("\n\n");
  const user = [
    `Repository: ${input.change.repositoryName}`,
    `Scout summary: ${input.scout.summary}`,
    "Excerpts:",
    excerpts || "(no files could be read)",
    'Reply with JSON: {"purpose":string,"architecture":string,"technologies":string[],"relationships":string[],"evidence":[{"source":string,"quote":string}]}',
  ].join("\n");
  return ask(input.llm, analystPrompt, user, analystReport);
}

export async function runAgentPass<T>(input: {
  changes: AnalysisChange[];
  hooks: AnalysisHooks;
  agent: "scout" | "analyst";
  run: (change: AnalysisChange) => Promise<T>;
  after?: (change: AnalysisChange, output: T) => Promise<void>;
}): Promise<number> {
  let count = 0;
  for (const change of input.changes) {
    if (await input.hooks.alreadyRan(change.id, input.agent)) continue;
    const output = await input.run(change);
    await input.hooks.saveRun(change.id, input.agent, JSON.stringify(output));
    if (input.after) await input.after(change, output);
    count += 1;
  }
  return count;
}

async function ask<T>(
  llm: LLMProvider,
  system: string,
  user: string,
  schema: Parameters<typeof parseAgentOutput<T>>[0],
): Promise<T> {
  const first = await llm.generate({ system, user });
  return parseAgentOutput(schema, first.text, async (error) => {
    const second = await llm.generate({
      system,
      user: `${user}\n\nThe previous reply was invalid: ${error}\nReply with JSON only.`,
    });
    return second.text;
  });
}
