import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { ProjectRow } from "../api/types.js";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ projects: ProjectRow[] }>("/api/projects")
      .then((body) => setProjects(body.projects))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <section>
      <h1>Projects</h1>
      {error ? <p>{error}</p> : null}
      {projects.length === 0 ? (
        <p className="muted">
          No portfolio projects yet. A new project appears here after you approve it.
        </p>
      ) : null}
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.name} · {project.slug}
            {project.description ? <div>{project.description}</div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
