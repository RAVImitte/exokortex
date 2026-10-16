import {
  analystPrompt,
  analystReport,
  curatorClassification,
  curatorPrompt,
  followupAnswer,
  type AnalystReport,
  type CuratorClassification,
} from "@exokortex/agents";
import type { LLMProvider } from "@exokortex/llm";
import { askAgent } from "./analyze.js";
import type { AnalysisChange } from "./analyze.js";

export interface PortfolioProjectRef {
  slug: string;
  name: string;
  description: string | null;
}

export function approvalAction(
  classification: CuratorClassification["classification"],
): "NEW_PROJECT" | "UPDATED_PROJECT" | null {
  if (classification === "NEW_PROJECT" || classification === "UPDATED_PROJECT")
    return classification;
  return null;
}

export function portfolioTarget<T extends { id: string; slug: string }>(input: {
  action: "NEW_PROJECT" | "UPDATED_PROJECT";
  projectId: string | null;
  projectSlug: string | null;
  projects: T[];
}): { mode: "link"; project: T } | { mode: "create" } {
  if (input.action !== "UPDATED_PROJECT") return { mode: "create" };
  const byId = input.projectId
    ? input.projects.find((project) => project.id === input.projectId)
    : undefined;
  const bySlug = input.projectSlug
    ? input.projects.find((project) => project.slug === input.projectSlug)
    : undefined;
  const project = byId ?? bySlug;
  if (!project) return { mode: "create" };
  return { mode: "link", project };
}

export async function curateChange(input: {
  llm: LLMProvider;
  change: AnalysisChange;
  analyst: AnalystReport;
  projects: PortfolioProjectRef[];
  notes?: string[];
}): Promise<CuratorClassification> {
  const registry =
    input.projects
      .map((project) =>
        [project.slug, project.name, project.description ?? ""].filter(Boolean).join(" — "),
      )
      .join("\n") || "(no portfolio projects)";
  const user = [
    `Repository: ${input.change.repositoryName}`,
    `Purpose: ${input.analyst.purpose}`,
    `Architecture: ${input.analyst.architecture}`,
    `Technologies: ${input.analyst.technologies.join(", ") || "(none)"}`,
    "Portfolio projects:",
    registry,
    input.notes?.length ? `Follow-up notes:\n${input.notes.join("\n")}` : "",
    'Reply with JSON: {"classification":"UNCHANGED"|"UPDATED_PROJECT"|"NEW_PROJECT"|"IGNORE","projectSlug":string|null,"reason":string,"followupQuestion":string|null}',
  ]
    .filter(Boolean)
    .join("\n");
  return askAgent(input.llm, curatorPrompt, user, curatorClassification);
}

export async function answerCuratorFollowup(input: {
  llm: LLMProvider;
  question: string;
  analyst: AnalystReport;
}): Promise<string> {
  const user = [
    `Curator question: ${input.question}`,
    `Known purpose: ${input.analyst.purpose}`,
    `Known architecture: ${input.analyst.architecture}`,
    'Reply with JSON: {"answer":string}',
  ].join("\n");
  const answer = await askAgent(input.llm, analystPrompt, user, followupAnswer);
  return answer.answer;
}

export async function curateWithFollowups(input: {
  llm: LLMProvider;
  change: AnalysisChange;
  analyst: AnalystReport;
  projects: PortfolioProjectRef[];
  maxFollowups: number;
}): Promise<CuratorClassification> {
  const notes: string[] = [];
  let report = await curateChange(input);
  let used = 0;
  while (report.followupQuestion && used < input.maxFollowups) {
    const answer = await answerCuratorFollowup({
      llm: input.llm,
      question: report.followupQuestion,
      analyst: input.analyst,
    });
    notes.push(`Q: ${report.followupQuestion}\nA: ${answer}`);
    used += 1;
    report = await curateChange({ ...input, notes });
  }
  return report;
}

export function parseAnalystReport(raw: string): AnalystReport {
  return analystReport.parse(JSON.parse(raw));
}
