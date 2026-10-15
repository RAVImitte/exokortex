import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { ChangeRow } from "../api/types.js";

export function ActivityPage() {
  const [changes, setChanges] = useState<ChangeRow[]>([]);

  useEffect(() => {
    api<{ changes: ChangeRow[] }>("/api/changes")
      .then((body) => setChanges(body.changes))
      .catch(() => setChanges([]));
  }, []);

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
          </li>
        ))}
      </ul>
    </section>
  );
}
