import type { LLMProvider } from "@exokortex/llm";
import { describe, expect, it } from "vitest";
import { approvalFollowUp, portfolioBranch, proposeEngineerEdit } from "./engineer.js";
import { caseStudyContent, discoverPortfolioProfile, projectDataFile } from "./portfolio.js";

function llm(replies: string[]): LLMProvider {
  return {
    async generate() {
      const next = replies.shift();
      if (!next) throw new Error("no reply left");
      return { text: next, model: "test" };
    },
  };
}

const profile = {
  framework: "NEXT_JS",
  projectDataPath: "src/data/projects.json",
  testCommand: "npm test",
  buildCommand: "npm run build",
};

const project = {
  slug: "api",
  name: "API",
  description: "A service",
  architecture: null,
  technologies: ["node"],
  sourceUrl: "https://github.com/acme/api",
};

describe("portfolio profile", () => {
  it("reads Next.js scripts and keeps an existing data file", () => {
    const draft = discoverPortfolioProfile({
      paths: ["package.json", "src/data/projects.ts", "src/app/page.tsx"],
      files: [
        {
          path: "package.json",
          content: JSON.stringify({
            dependencies: { next: "15.0.0" },
            scripts: { test: "vitest", build: "next build" },
          }),
        },
      ],
    });
    expect(draft).toEqual({
      framework: "NEXT_JS",
      projectDataPath: "src/data/projects.ts",
      testCommand: "vitest",
      buildCommand: "next build",
    });
  });

  it("uses one file per project when the site stores them that way", () => {
    const draft = discoverPortfolioProfile({
      paths: ["package.json", "src/content/projects/zero-miles.json", "vite.config.ts"],
      files: [
        {
          path: "package.json",
          content: JSON.stringify({
            dependencies: { vite: "8.0.0" },
            scripts: { test: "npm test", build: "tsc -b && vite build" },
          }),
        },
      ],
    });
    expect(draft.framework).toBe("VITE");
    expect(draft.projectDataPath).toBe("src/content/projects/{slug}.json");
    expect(projectDataFile(draft.projectDataPath, "ExoKortex")).toBe(
      "src/content/projects/exokortex.json",
    );
  });

  it("picks a data path when the tree has no project file", () => {
    const draft = discoverPortfolioProfile({
      paths: ["pyproject.toml"],
      files: [],
    });
    expect(draft.framework).toBe("PYTHON");
    expect(draft.projectDataPath).toBe("src/data/projects.json");
    expect(draft.testCommand).toBe("pytest");
  });
});

describe("engineer follow-up", () => {
  it("waits while another approval is pending", () => {
    expect(approvalFollowUp({ pendingLeft: 1, approvedWithoutPullRequest: 1 })).toBe("wait");
  });

  it("completes a rejection that approved nothing", () => {
    expect(approvalFollowUp({ pendingLeft: 0, approvedWithoutPullRequest: 0 })).toBe("complete");
  });

  it("engineers once the last pending approval is resolved", () => {
    expect(approvalFollowUp({ pendingLeft: 0, approvedWithoutPullRequest: 2 })).toBe("engineer");
  });

  it("names a branch from the project slug", () => {
    expect(portfolioBranch("API", "apr_ABCDEF12")).toBe("exokortex/api-aprabcde");
  });
});

describe("engineer edit", () => {
  it("writes a case study when the portfolio file does not exist yet", async () => {
    const change = await proposeEngineerEdit({
      llm: llm([]),
      repositoryName: "RAVImitte/portfolio",
      profile: {
        ...profile,
        projectDataPath: "src/content/projects/exokortex.json",
      },
      project: {
        ...project,
        slug: "exokortex",
        name: "ExoKortex",
        description: "Watches repositories and proposes portfolio updates.",
        architecture: "A Worker API stores scan state and opens a pull request.",
        technologies: ["TypeScript", "Cloudflare Workers"],
        sourceUrl: "https://github.com/RAVImitte/exokortex",
      },
      currentContent: null,
    });
    const body = JSON.parse(change.content) as {
      slug: string;
      route: string;
      section: string;
      problem: string[];
      stack: string[];
      lenses: { backend: { dek: string }; android: { dek: string } };
      brief: { problem: string; contribution: string; result: string };
      built: string[];
      index: { backend: { no: string; home: boolean; dek: string }; android: { dek: string } };
      sourceRepos: string[];
    };
    expect(change.path).toBe("src/content/projects/exokortex.json");
    expect(body.slug).toBe("exokortex");
    expect(body.route).toBe("/projects/exokortex");
    expect(body.section).toBe("projects");
    expect(body.problem.length).toBeGreaterThan(0);
    expect(body.stack.length).toBeGreaterThan(0);
    expect(body.lenses.backend.dek.length).toBeGreaterThan(0);
    expect(body.index.backend.no).toBe("99");
    expect(body.index.backend.home).toBe(false);
    expect(body.sourceRepos).toEqual(["https://github.com/RAVImitte/exokortex"]);
    const sections = [
      body.problem[0],
      body.built[0],
      body.brief.contribution,
      body.brief.result,
      body.lenses.android.dek,
      body.index.android.dek,
    ];
    expect(new Set(sections).size).toBe(sections.length);
    expect(caseStudyContent(project).includes('"slug"')).toBe(true);
  });

  it("retries a layout path and keeps the project data path", async () => {
    const change = await proposeEngineerEdit({
      llm: llm([
        JSON.stringify({
          path: "src/App.tsx",
          content: "nope",
          commitMessage: "nope",
          prTitle: "nope",
          prBody: "nope",
        }),
        JSON.stringify({
          path: profile.projectDataPath,
          content: '[{"slug":"api"}]',
          commitMessage: "Add API",
          prTitle: "Add API",
          prBody: "Adds the approved project.",
        }),
      ]),
      repositoryName: "acme/site",
      profile,
      project,
      currentContent: "[]",
    });
    expect(change.path).toBe(profile.projectDataPath);
    expect(change.content).toBe('[{"slug":"api"}]');
  });

  it("rejects an edit that does not change the file", async () => {
    await expect(
      proposeEngineerEdit({
        llm: llm([
          JSON.stringify({
            path: profile.projectDataPath,
            content: "[]",
            commitMessage: "Add API",
            prTitle: "Add API",
            prBody: "Adds the approved project.",
          }),
        ]),
        repositoryName: "acme/site",
        profile,
        project,
        currentContent: "[]",
      }),
    ).rejects.toThrow(/unchanged/);
  });
});
