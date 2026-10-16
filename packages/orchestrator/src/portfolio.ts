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

export function discoverPortfolioProfile(input: {
  paths: string[];
  files: { path: string; content: string }[];
}): PortfolioProfileDraft {
  const projectDataPath =
    DATA_FILES.find((path) => input.paths.includes(path)) ?? DEFAULT_DATA_PATH;
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
