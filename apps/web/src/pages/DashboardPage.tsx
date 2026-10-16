import {
  Activity,
  Check,
  ChevronRight,
  Clock,
  FolderGit2,
  FolderKanban,
  Inbox,
  CalendarClock,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import type { ConnectionRow, DashboardSnapshot, RepositoryRow } from "../api/types.js";
import { useDashboard } from "../hooks/useDashboard.js";
import { relativeTime } from "../time.js";
import { AnimatedItem, AnimatedList } from "../ui/AnimatedList.js";
import { Badge } from "../ui/Badge.js";
import { ButtonLink } from "../ui/Button.js";
import { Card } from "../ui/Card.js";
import { ChangeCard, ChangeDot } from "../ui/ChangeCard.js";
import { EmptyState } from "../ui/EmptyState.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Skeleton } from "../ui/Skeleton.js";
import { Stat } from "../ui/Stat.js";

interface SetupState {
  connections: ConnectionRow[];
  repositories: RepositoryRow[];
}

export function DashboardPage() {
  const { data, error } = useDashboard();
  const [setup, setSetup] = useState<SetupState | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ connections: ConnectionRow[] }>("/api/connections"),
      api<{ repositories: RepositoryRow[] }>("/api/repositories"),
    ])
      .then(([c, r]) => setSetup({ connections: c.connections, repositories: r.repositories }))
      .catch(() => setSetup({ connections: [], repositories: [] }));
  }, []);

  if (error && !data) return <p className="error-text">{error}</p>;
  if (!data || !setup) return <DashboardSkeleton />;

  const recent = data.recentActivity ?? [];

  return (
    <section>
      <PageHeader
        title="Home"
        description="What changed in your work, and what is waiting on you."
        actions={
          data.pendingApprovals > 0 ? (
            <ButtonLink to="/approvals" variant="primary" icon={Inbox}>
              Review {data.pendingApprovals}{" "}
              {data.pendingApprovals === 1 ? "approval" : "approvals"}
            </ButtonLink>
          ) : null
        }
      />
      <SetupChecklist data={data} setup={setup} />
      <div className="stats">
        <Stat
          label="Repositories"
          value={data.repositoryCount}
          icon={FolderGit2}
          to="/repositories"
        />
        <Stat
          label="Portfolio projects"
          value={data.portfolioProjectCount}
          icon={FolderKanban}
          to="/projects"
        />
        <Stat
          label="Pending approvals"
          value={data.pendingApprovals}
          icon={Inbox}
          to="/approvals"
        />
        <Stat
          label="Last scan"
          value={data.lastScan ? relativeTime(data.lastScan) : "Never"}
          icon={Clock}
          to="/activity"
        />
        <Stat
          label="Next scan"
          value={data.nextScan ? relativeTime(data.nextScan) : "Not scheduled"}
          icon={CalendarClock}
          to="/settings"
        />
      </div>
      <div className="section-title">
        <h2>Recent activity</h2>
        {recent.length > 0 ? (
          <Link to="/activity" className="btn btn-ghost btn-sm">
            View all <ChevronRight size={14} />
          </Link>
        ) : null}
      </div>
      {recent.length === 0 ? (
        <EmptyState icon={Activity} title="No changes yet">
          The first scan records a baseline. Changes appear here after a later scan sees a new
          revision.
        </EmptyState>
      ) : (
        <AnimatedList className="timeline">
          {recent.map((change) => (
            <AnimatedItem key={change.id} className="timeline-item">
              <ChangeDot status={change.status} />
              <ChangeCard {...change} />
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}
    </section>
  );
}

function SetupChecklist({ data, setup }: { data: DashboardSnapshot; setup: SetupState }) {
  const steps = [
    {
      label: "Connect a source",
      done: setup.connections.some((row) => row.status === "active"),
      to: "/connections",
    },
    { label: "Save an LLM key", done: data.llmConfigured, to: "/ai" },
    {
      label: "Mark a portfolio",
      done: setup.repositories.some((repo) => repo.role === "PORTFOLIO"),
      to: "/repositories",
    },
    { label: "Run the first scan", done: data.lastScan !== null, to: "/repositories" },
  ];
  const finished = steps.filter((step) => step.done).length;
  if (finished === steps.length) return null;

  return (
    <Card className="checklist" style={{ marginBottom: 24 }}>
      <div className="spread">
        <div>
          <h2>Get set up</h2>
          <p className="muted">Four steps before ExoKortex can propose portfolio updates.</p>
        </div>
        <Badge tone="accent" plain>
          {finished} of {steps.length}
        </Badge>
      </div>
      <div className="progress">
        <motion.div
          className="progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${(finished / steps.length) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="check-items">
        {steps.map((step) =>
          step.done ? (
            <div key={step.label} className="check-item done">
              <span className="check-dot">
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="check-label">{step.label}</span>
            </div>
          ) : (
            <Link key={step.label} to={step.to} className="check-item">
              <span className="check-dot" />
              <span className="check-label">{step.label}</span>
              <ChevronRight size={16} className="chevron" />
            </Link>
          ),
        )}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <section aria-busy="true">
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={120} height={28} />
        <div style={{ height: 8 }} />
        <Skeleton width={320} height={16} />
      </div>
      <div className="stats">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} height={104} radius={14} />
        ))}
      </div>
    </section>
  );
}
