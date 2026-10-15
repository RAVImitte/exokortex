import { useEffect, useState } from "react";
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
        <Stat label="Repositories" value={String(data.repositoryCount)} />
        <Stat label="Portfolio projects" value={String(data.portfolioProjectCount)} />
        <Stat label="Pending approvals" value={String(data.pendingApprovals)} />
        <Stat
          label="Last scan"
          value={data.lastScan ? new Date(data.lastScan).toLocaleString() : "Never"}
        />
        <Stat
          label="Next scan"
          value={data.nextScan ? new Date(data.nextScan).toLocaleString() : "Not scheduled"}
        />
        <Stat label="System" value="Local" />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}
