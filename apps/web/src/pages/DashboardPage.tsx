import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import type { DashboardSnapshot } from "../api/types.js";

export function DashboardPage() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardSnapshot>("/api/dashboard")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <section>
      <h1>Dashboard</h1>
      <div className="grid">
        <Stat label="Repositories" value={String(data.repositoryCount)} to="/repositories" />
        <Stat
          label="Portfolio projects"
          value={String(data.portfolioProjectCount)}
          to="/projects"
        />
        <Stat label="Pending approvals" value={String(data.pendingApprovals)} to="/approvals" />
        <Stat
          label="Last scan"
          value={data.lastScan ? new Date(data.lastScan).toLocaleString() : "Never"}
          to="/activity"
        />
        <Stat
          label="Next scan"
          value={data.nextScan ? new Date(data.nextScan).toLocaleString() : "Not scheduled"}
          to="/settings"
        />
        <Stat label="System" value={systemStatus(data)} />
      </div>
      <h2>Recent activity</h2>
      {(data.recentActivity ?? []).length === 0 ? (
        <p className="muted">No change events yet. The first scan only records a baseline.</p>
      ) : (
        <ul>
          {(data.recentActivity ?? []).map((change) => (
            <li key={change.id}>
              <Link to="/activity">{change.repositoryName}</Link> ·{" "}
              {change.fromRevision.slice(0, 7)} → {change.toRevision.slice(0, 7)}
              {change.significance ? ` · ${change.significance}` : ""} · {change.status} ·{" "}
              {new Date(change.createdAt).toLocaleString()}
              {change.summary ? <div>{change.summary}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function systemStatus(data: DashboardSnapshot): string {
  if (!data.githubConnected) return "GitHub not connected";
  if (!data.llmConfigured) return "LLM key not saved";
  return "Ready";
}

function Stat({ label, value, to }: { label: string; value: string; to?: string }) {
  const body = (
    <>
      <div className="muted">{label}</div>
      <strong>{value}</strong>
    </>
  );
  if (!to) {
    return <div className="card">{body}</div>;
  }
  return (
    <Link className="card" to={to}>
      {body}
    </Link>
  );
}
