import profileJson from "./data/profile.json";

export interface Profile {
  name: string;
  role: string;
  bio: string;
  location: string;
  email: string;
  links: { label: string; href: string }[];
}

export interface ProjectFile {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  sourceUrl: string;
}

const modules = import.meta.glob("./content/projects/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ProjectFile>;

export const profile = profileJson as Profile;

export function loadProjects(): ProjectFile[] {
  return Object.values(modules).sort((a, b) => a.title.localeCompare(b.title));
}
