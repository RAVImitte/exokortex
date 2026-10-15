import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { ConnectionRow } from "../api/types.js";

export function ConnectionsPage() {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ connections: ConnectionRow[] }>("/api/connections")
      .then((body) => setRows(body.connections))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <section>
      <h1>Connections</h1>
      <p>
        <a className="button" href="/api/github/install">
          Connect GitHub
        </a>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.provider} · {row.status}{" "}
            <button
              className="ghost"
              type="button"
              onClick={() => {
                void api(`/api/connections/${row.id}`, { method: "DELETE" }).then(() =>
                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id ? { ...item, status: "revoked" } : item,
                    ),
                  ),
                );
              }}
            >
              Disconnect
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="muted">No connections yet.</p> : null}
    </section>
  );
}
