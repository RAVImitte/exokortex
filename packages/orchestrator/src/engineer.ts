import { engineerChange, portfolioEngineerPrompt, type EngineerChange } from "@exokortex/agents";
import type { LLMProvider } from "@exokortex/llm";
import { askAgent } from "./analyze.js";
import { caseStudyContent, isCaseStudyPath, templateProjectContent } from "./portfolio.js";

export interface EngineerProject {
  slug: string;
  name: string;
  description: string | null;
  architecture: string | null;
  technologies: string[];
  sourceUrl: string;
}

export interface EngineerProfile {
  framework: string;
  projectDataPath: string;
  testCommand: string;
  buildCommand: string;
  contract?: "exokortex-v1";
}

export function approvalFollowUp(input: {
  pendingLeft: number;
  approvedWithoutPullRequest: number;
}): "wait" | "complete" | "engineer" {
  if (input.pendingLeft > 0) return "wait";
  if (input.approvedWithoutPullRequest === 0) return "complete";
  return "engineer";
}

export function portfolioBranch(slug: string, approvalId: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  const suffix = approvalId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  return `exokortex/${safe || "project"}-${suffix || "change"}`;
}

export async function proposeEngineerEdit(input: {
  llm: LLMProvider;
  repositoryName: string;
  profile: EngineerProfile;
  project: EngineerProject;
  currentContent: string | null;
}): Promise<EngineerChange> {
  const path = input.profile.projectDataPath;
  if (input.profile.contract === "exokortex-v1" && isCaseStudyPath(path)) {
    const title = input.project.name.trim() || input.project.slug;
    const created = input.currentContent === null;
    return {
      path,
      content: templateProjectContent(input.project, input.currentContent),
      commitMessage: created ? `Add ${title} to the portfolio` : `Update ${title} in the portfolio`,
      prTitle: created ? `Add ${title}` : `Update ${title}`,
      prBody: created
        ? `Adds the approved project ${title} as a portfolio file.`
        : `Updates the approved project ${title} in its portfolio file.`,
    };
  }
  if (isCaseStudyPath(path) && input.currentContent === null) {
    const title = input.project.name.trim() || input.project.slug;
    return {
      path,
      content: caseStudyContent(input.project),
      commitMessage: `Add ${title} to the portfolio`,
      prTitle: `Add ${title}`,
      prBody: `Adds the approved project ${title} in the portfolio case-study format.`,
    };
  }
  const user = [
    `Portfolio repository: ${input.repositoryName}`,
    `Edit only this path: ${path}`,
    `Framework: ${input.profile.framework}`,
    `Test command (do not run it): ${input.profile.testCommand || "(none)"}`,
    `Build command (do not run it): ${input.profile.buildCommand || "(none)"}`,
    "Approved project:",
    JSON.stringify({
      slug: input.project.slug,
      name: input.project.name,
      description: input.project.description,
      technologies: input.project.technologies,
      sourceUrl: input.project.sourceUrl,
    }),
    "Current file:",
    input.currentContent ?? "(file does not exist yet)",
    `Reply with JSON: {"path":${JSON.stringify(path)},"content":string,"commitMessage":string,"prTitle":string,"prBody":string}`,
    "content is the full new file. Change the project data only.",
  ].join("\n");
  const change = await askAgent(input.llm, portfolioEngineerPrompt, user, engineerChange(path));
  if (input.currentContent !== null && change.content === input.currentContent) {
    throw new Error("engineer left the project data unchanged");
  }
  return change;
}
