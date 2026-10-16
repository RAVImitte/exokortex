import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client.js";
import type { ConnectionRow } from "../api/types.js";

export function ConnectionsPage() {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [token, setToken] = useState("");
  const [kaggleToken, setKaggleToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    return api<{ connections: ConnectionRow[] }>("/api/connections").then((body) =>
      setRows(body.connections),
    );
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  async function connectHuggingFace(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const body = await api<{ username: string; repositories: number }>(
        "/api/huggingface/connect",
        {
          method: "POST",
          body: JSON.stringify({ token }),
        },
      );
      setToken("");
      setMessage(`Connected ${body.username}. ${body.repositories} repositories stored.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hugging Face connection failed");
    }
  }

  async function connectKaggle(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const body = await api<{ username: string; repositories: number }>("/api/kaggle/connect", {
        method: "POST",
        body: JSON.stringify({ token: kaggleToken }),
      });
      setKaggleToken("");
      setMessage(`Connected ${body.username}. ${body.repositories} repositories stored.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaggle connection failed");
    }
  }

  return (
    <section>
      <h1>Connections</h1>
      <p>
        <a className="button" href="/api/github/install">
          Connect GitHub
        </a>{" "}
        <a className="button" href="/api/google/install">
          Connect Google
        </a>
      </p>
      <p className="muted">
        Google connects Colab notebooks you own. The portfolio stays on GitHub.
      </p>
      <form className="stack" onSubmit={(event) => void connectHuggingFace(event)}>
        <label>
          Hugging Face read token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="hf_..."
          />
        </label>
        <p className="muted">
          Models, datasets, and spaces you own become source repositories. The portfolio stays on
          GitHub. The token is encrypted and is not shown again.
        </p>
        <button type="submit">Connect Hugging Face</button>
      </form>
      <form className="stack" onSubmit={(event) => void connectKaggle(event)}>
        <label>
          Kaggle API token
          <input
            type="password"
            autoComplete="off"
            value={kaggleToken}
            onChange={(event) => setKaggleToken(event.target.value)}
            placeholder="KGAT_..."
          />
        </label>
        <p className="muted">
          Datasets and notebooks you own become source repositories. The portfolio stays on GitHub.
          The token is encrypted and is not shown again.
        </p>
        <button type="submit">Connect Kaggle</button>
      </form>
      {message ? <p>{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.provider} · {row.externalUserId ?? row.externalInstallationId ?? "account"} ·{" "}
            {row.status}{" "}
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
