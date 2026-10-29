import { FolderKanban, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { api, messageOf } from "../api/client.js";
import type { ProjectRow } from "../api/types.js";
import { AnimatedCell, AnimatedGrid } from "../ui/AnimatedList.js";
import { Badge } from "../ui/Badge.js";
import { ButtonLink } from "../ui/Button.js";
import { EmptyState } from "../ui/EmptyState.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Skeleton } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    api<{ projects: ProjectRow[] }>("/api/projects")
      .then((body) => setProjects(body.projects))
      .catch((err: unknown) => {
        setProjects([]);
        toast.error(messageOf(err, "Failed to load projects"));
      });
  }, [toast]);

  return (
    <section>
      <PageHeader
        title="Projects"
        description="The projects your portfolio shows. New ones arrive after you approve them."
      />
      {projects === null ? (
        <div className="project-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} height={140} radius={14} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No portfolio projects yet"
          action={
            <ButtonLink to="/approvals" icon={Inbox}>
              Open approvals
            </ButtonLink>
          }
        >
          A project appears here after Curator proposes it and you approve it.
        </EmptyState>
      ) : (
        <AnimatedGrid className="project-grid">
          {projects.map((project, index) => (
            <AnimatedCell key={project.id}>
              <article className="card card-interactive project-card">
                <div className={`project-cover project-cover-${index % 3}`} aria-hidden="true">
                  <span>{project.name.slice(0, 2)}</span>
                  <FolderKanban size={30} strokeWidth={1} />
                </div>
                <div className="spread">
                  <h3>{project.name}</h3>
                  <Badge>{project.status}</Badge>
                </div>
                <span className="subtle mono">{project.slug}</span>
                {project.description ? <p>{project.description}</p> : null}
                {project.technologies.length > 0 ? (
                  <div className="cluster">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="chip">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            </AnimatedCell>
          ))}
        </AnimatedGrid>
      )}
    </section>
  );
}
