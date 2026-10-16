const DATA_FILES = [
  "src/data/projects.ts",
  "src/data/projects.json",
  "src/data/projects.yaml",
  "src/data/projects.yml",
  "data/projects.ts",
  "data/projects.json",
  "data/projects.yaml",
  "data/projects.yml",
  "content/projects.mdx",
  "content/projects.md",
  "src/content/projects.mdx",
  "projects.json",
  "projects.yaml",
  "projects.yml",
  "projects.mdx",
  "projects.md",
];

const MANIFESTS = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "requirements.txt"];

const DEFAULT_DATA_PATH = "src/data/projects.json";

export interface PortfolioProfileDraft {
  framework: string;
  projectDataPath: string;
  testCommand: string;
  buildCommand: string;
}

export function profileManifests(paths: string[]): string[] {
  return MANIFESTS.filter((path) => paths.includes(path));
}

const PROJECT_DIRS = ["src/content/projects", "content/projects"];

export function caseStudySlug(slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "project";
}

export function projectDataFile(pattern: string, slug: string): string {
  return pattern.replaceAll("{slug}", caseStudySlug(slug));
}

export function isCaseStudyPath(path: string): boolean {
  return /^src\/content\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(path);
}

function prose(value: string | null | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text || text === "Not stated.") return "";
  return text;
}

export function caseStudyContent(project: {
  slug: string;
  name: string;
  description: string | null;
  architecture?: string | null;
  technologies: string[];
  sourceUrl: string;
}): string {
  const slug = caseStudySlug(project.slug);
  const title = project.name.trim() || slug;
  const purpose = prose(project.description) || `${title} is a software project.`;
  const stack = project.technologies.map((item) => item.trim()).filter(Boolean);
  if (stack.length === 0) stack.push("TypeScript");
  const stackLine = stack.join(", ");
  const built =
    prose(project.architecture) && prose(project.architecture) !== purpose
      ? prose(project.architecture)
      : `${title} is built with ${stackLine}.`;
  const source = project.sourceUrl.trim();
  const sourceLine =
    source.startsWith("https://") || source.startsWith("http://")
      ? `The source repository is ${source}.`
      : `The source repository for ${title} is not linked yet.`;
  const document = {
    $schema: "../.schema/project.schema.json",
    slug,
    kicker: stack.slice(0, 3).join(" · "),
    title,
    flipId: `title-${slug}`,
    dek: purpose,
    role: "Solo",
    timeframe: "2026",
    chapters: [
      { id: "problem", label: "Problem" },
      { id: "built", label: "What I built" },
      { id: "stack", label: "Stack" },
    ],
    problem: [purpose],
    constraints: [],
    built: [built],
    hardParts: [],
    metrics: [],
    outcomes: [],
    stack,
    lenses: {
      backend: {
        dek: built,
        frame: `The recorded architecture for ${title} is separate from its interface.`,
        stackLead: stack.slice(0, 4),
      },
      android: {
        dek: `No separate Android client is recorded for ${title}.`,
        frame: `The recorded stack is ${stackLine}.`,
        stackLead: stack.slice(0, 4),
      },
    },
    route: `/projects/${slug}`,
    section: "projects",
    accent: "slate",
    brief: {
      status: "Draft",
      problem: purpose,
      contribution: `${title} uses ${stackLine}.`,
      result: sourceLine,
    },
    index: {
      backend: { no: "99", kicker: title, dek: purpose, home: false },
      android: { no: "99", kicker: stack[0] ?? title, dek: `Stack: ${stackLine}.`, home: false },
    },
    sourceRepos: source.startsWith("https://") || source.startsWith("http://") ? [source] : [],
    ...(source.startsWith("https://") || source.startsWith("http://")
      ? { sources: [{ label: "Source", href: source }] }
      : {}),
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function discoverPortfolioProfile(input: {
  paths: string[];
  files: { path: string; content: string }[];
}): PortfolioProfileDraft {
  const projectDir = PROJECT_DIRS.find((dir) =>
    input.paths.some((path) => path.startsWith(`${dir}/`) && path.endsWith(".json")),
  );
  const projectDataPath = projectDir
    ? `${projectDir}/{slug}.json`
    : (DATA_FILES.find((path) => input.paths.includes(path)) ?? DEFAULT_DATA_PATH);
  const packageJson = readJson(input.files.find((file) => file.path === "package.json")?.content);
  const scripts = record(packageJson.scripts);
  const dependencies = {
    ...record(packageJson.dependencies),
    ...record(packageJson.devDependencies),
  };
  if (Object.keys(dependencies).length > 0 || Object.keys(scripts).length > 0 || packageJson.name) {
    return {
      framework: frameworkFromNode(dependencies),
      projectDataPath,
      testCommand: stringValue(scripts.test) || "npm test",
      buildCommand: stringValue(scripts.build) || "npm run build",
    };
  }
  if (input.paths.includes("pyproject.toml") || input.paths.includes("requirements.txt")) {
    return { framework: "PYTHON", projectDataPath, testCommand: "pytest", buildCommand: "" };
  }
  if (input.paths.includes("Cargo.toml")) {
    return {
      framework: "RUST",
      projectDataPath,
      testCommand: "cargo test",
      buildCommand: "cargo build",
    };
  }
  if (input.paths.includes("go.mod")) {
    return {
      framework: "GO",
      projectDataPath,
      testCommand: "go test ./...",
      buildCommand: "go build ./...",
    };
  }
  return { framework: "UNKNOWN", projectDataPath, testCommand: "", buildCommand: "" };
}

function frameworkFromNode(dependencies: Record<string, unknown>): string {
  if (dependencies.next) return "NEXT_JS";
  if (dependencies.astro) return "ASTRO";
  if (dependencies.vite) return "VITE";
  if (dependencies.react) return "REACT";
  return "NODE";
}

function readJson(content: string | undefined): Record<string, unknown> {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
