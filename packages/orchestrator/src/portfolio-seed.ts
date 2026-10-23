import { caseStudySlug, projectDataFile, templateProjectContent } from "./portfolio.js";
import { portfolioTemplateFiles } from "./template-scaffold.js";
import type { EngineerProject } from "./engineer.js";

const PROJECT_PATTERN = "src/content/projects/{slug}.json";

export function projectFromSource(input: {
  name: string;
  url: string;
  readme?: string | null;
  packageJson?: string | null;
}): EngineerProject {
  const short = input.name.split("/").pop()?.trim() || input.name.trim();
  const slug = caseStudySlug(short);
  const fromReadme = summaryFromReadme(input.readme ?? "");
  const manifest = packageDetails(input.packageJson ?? "");
  return {
    slug,
    name: short,
    description: fromReadme || manifest.description || null,
    architecture: null,
    technologies: manifest.stack,
    sourceUrl: input.url,
  };
}

export function portfolioSeedFiles(input: {
  projects: EngineerProject[];
  includeTemplate: boolean;
}): { path: string; content: string }[] {
  const files = input.includeTemplate ? portfolioTemplateFiles.map((file) => ({ ...file })) : [];
  const used = new Set<string>();
  for (const project of input.projects) {
    let slug = caseStudySlug(project.slug || project.name);
    const base = slug;
    let n = 2;
    while (used.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    used.add(slug);
    files.push({
      path: projectDataFile(PROJECT_PATTERN, slug),
      content: templateProjectContent({ ...project, slug }, null),
    });
  }
  return files;
}

function summaryFromReadme(raw: string): string {
  const withoutFences = raw.replace(/```[\s\S]*?```/g, " ");
  const lines = withoutFences
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith("#") &&
        !line.startsWith("![") &&
        !line.startsWith("[!") &&
        line !== "---",
    );
  const paragraph = lines
    .slice(0, 4)
    .join(" ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return paragraph.slice(0, 400);
}

function packageDetails(raw: string): { description: string; stack: string[] } {
  if (!raw.trim()) return { description: "", stack: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { description: "", stack: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { description: "", stack: [] };
  }
  const record = parsed as {
    description?: unknown;
    dependencies?: unknown;
    devDependencies?: unknown;
  };
  const description = typeof record.description === "string" ? record.description.trim() : "";
  const names = [
    ...dependencyNames(record.dependencies),
    ...dependencyNames(record.devDependencies),
  ];
  const preferred = names.filter((name) =>
    ["react", "vue", "svelte", "next", "vite", "hono", "express", "fastify", "typescript"].some(
      (item) => name === item || name.endsWith(`/${item}`),
    ),
  );
  const stack = (preferred.length > 0 ? preferred : names)
    .filter((name) => !name.startsWith("@types/"))
    .slice(0, 6);
  return { description, stack };
}

function dependencyNames(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value);
}
