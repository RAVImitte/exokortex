import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { ChangeRow } from "../api/types.js";

export function ActivityPage() {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ changes: ChangeRow[] }>("/api/changes")
      .then((body) => setChanges(body.changes))
      .catch(() => setChanges([]));
  }, []);

  async function analyze(changeId: string) {
    setStatus("");
    try {
      await api(`/api/changes/${changeId}/analyze`, { method: "POST" });
      setStatus("Analysis queued.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Analyze failed");
    }
  }

  return (
    <section>
      <h1>Activity</h1>
      {changes.length === 0 ? (
        <p className="muted">No change events yet. The first scan only records a baseline.</p>
      ) : null}
      <ul>
        {changes.map((change) => (
          <li key={change.id}>
            {change.fromRevision.slice(0, 7)} → {change.toRevision.slice(0, 7)}
            {change.significance ? ` · ${change.significance}` : ""} · {change.status} ·{" "}
            {new Date(change.createdAt).toLocaleString()}
            {change.summary ? <div>{change.summary}</div> : null}
            {change.status === "ignored" ||
            (change.status === "open" && change.significance === "noise") ? (
              <div>
                <button className="ghost" type="button" onClick={() => void analyze(change.id)}>
                  Run analysis
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {status ? <p>{status}</p> : null}
    </section>
  );
}
