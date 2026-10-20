import { Link, Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { loadProjects, profile, type ProjectFile } from "./content";

const projects = loadProjects();

function mailHref(): string {
  const subject = encodeURIComponent("Hello from the portfolio");
  return `mailto:${profile.email}?subject=${subject}`;
}

function firstName(): string {
  return profile.name.split(" ")[0] || profile.name;
}

function ProjectDetail({ project }: { project: ProjectFile }) {
  return (
    <div className="detail-body">
      <p>{project.summary}</p>
      <p className="stack">{project.stack.join(", ")}</p>
      <a className="button" href={project.sourceUrl}>
        View the source
      </a>
    </div>
  );
}

function Home() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("project");
  const selected = projects.some((item) => item.slug === requested)
    ? requested
    : (projects[0]?.slug ?? null);
  const current = projects.find((item) => item.slug === selected) ?? null;

  function choose(slug: string) {
    setParams({ project: slug }, { replace: true });
  }

  return (
    <>
      <a className="skip" href="#work">
        Skip to the work
      </a>
      <header className="hero" id="top">
        <nav className="nav" aria-label="Page">
          <a href="/#work">The work</a>
          <a href="/#write">Write</a>
        </nav>
        <h1>{profile.name}</h1>
        <p className="role">{profile.role}</p>
        <p className="bio">{profile.bio}</p>
        <a className="button" href={mailHref()}>
          Write to {firstName()}
        </a>
      </header>
      <section className="work" id="work">
        <h2>The work</h2>
        {projects.length === 0 ? (
          <p>Nothing has been approved yet. An approved repository appears here.</p>
        ) : (
          <div className="work-grid">
            <ol>
              {projects.map((project) => {
                const active = project.slug === selected;
                return (
                  <li key={project.slug}>
                    <button
                      type="button"
                      className="name-row"
                      aria-pressed={active}
                      onClick={() => choose(project.slug)}
                      onFocus={() => choose(project.slug)}
                      onMouseEnter={() => choose(project.slug)}
                    >
                      <span>{project.title}</span>
                      <span className="name-meta">{project.stack.join(", ")}</span>
                    </button>
                    <div className="inline-detail">
                      <ProjectDetail project={project} />
                    </div>
                  </li>
                );
              })}
            </ol>
            {current ? (
              <aside className="detail" aria-live="polite">
                <ProjectDetail key={current.slug} project={current} />
                <Link className="text-link" to={`/projects/${current.slug}`}>
                  Read {current.title}
                </Link>
              </aside>
            ) : null}
          </div>
        )}
      </section>
      <section className="write" id="write">
        <h2>Write</h2>
        <p>{profile.location}</p>
        <a href={mailHref()}>{profile.email}</a>
        {profile.links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
        <a className="button" href={mailHref()}>
          Write to {firstName()}
        </a>
      </section>
      <Footer />
    </>
  );
}

function ProjectPage() {
  const { slug } = useParams();
  const project = projects.find((item) => item.slug === slug);
  if (!project) return <Navigate to="/" replace />;
  return (
    <>
      <a className="skip" href="#project">
        Skip to the project
      </a>
      <main className="project" id="project">
        <p>
          <Link to="/#work">Back to the work</Link>
        </p>
        <h1>{project.title}</h1>
        <ProjectDetail project={project} />
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>{profile.name}</p>
      <nav aria-label="Footer">
        <a href="/#work">The work</a>
        <a href="/#write">Write</a>
      </nav>
      <p className="year">2026</p>
    </footer>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
