import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { RepositoryRow } from "../api/types.js";

export function RepositoriesPage() {
  const [repos, setRepos] = useState<RepositoryRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const body = await api<{ repositories: RepositoryRow[] }>("/api/repositories");
    setRepos(body.repositories);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  async function setRole(id: string, role: string) {
    setMessage("");
    await api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    await load();
  }

  async function scan() {
    setMessage("");
    try {
      await api("/api/scans", { method: "POST" });
      setMessage("Scan queued.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    }
  }

  return (
    <section>
      <h1>Repositories</h1>
      <p>
        <button type="button" onClick={() => void scan()}>
          Scan now
        </button>
      </p>
      {message ? <p>{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Branch</th>
            <th>Revision</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <tr key={repo.id}>
              <td>
                <a href={repo.url}>{repo.name}</a>
              </td>
              <td>{repo.defaultBranch}</td>
              <td className="muted">{repo.lastRevision?.slice(0, 7) ?? "not scanned"}</td>
              <td>
                <select
                  value={repo.role}
                  onChange={(event) => void setRole(repo.id, event.target.value)}
                >
                  <option value="SOURCE">Source</option>
                  <option value="PORTFOLIO">Portfolio</option>
                  <option value="EXCLUDED">Excluded</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {repos.length === 0 ? (
        <p className="muted">No repositories yet. Connect GitHub first.</p>
      ) : null}
    </section>
  );
}
