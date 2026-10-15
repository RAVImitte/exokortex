import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import type { Me } from "../api/types.js";

export function SettingsPage() {
  const [timezone, setTimezone] = useState("UTC");
  const [scanFrequency, setScanFrequency] = useState("weekly");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<Me>("/api/me")
      .then((me) => {
        setTimezone(me.timezone);
        setScanFrequency(me.scanFrequency);
      })
      .catch(() => undefined);
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    void api("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ timezone, scanFrequency }),
    })
      .then(() => setStatus("Saved."))
      .catch((err: unknown) => setStatus(err instanceof Error ? err.message : "Save failed"));
  }

  return (
    <section>
      <h1>Settings</h1>
      <form className="stack" onSubmit={save}>
        <label>
          Timezone
          <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </label>
        <label>
          Scan frequency
          <select value={scanFrequency} onChange={(event) => setScanFrequency(event.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <button type="submit">Save</button>
      </form>
      {status ? <p>{status}</p> : null}
      <h2>Account</h2>
      <button
        className="ghost"
        type="button"
        onClick={() => {
          if (!window.confirm("Delete your ExoKortex account data?")) return;
          void api("/api/account", { method: "DELETE" }).then(() => window.location.assign("/"));
        }}
      >
        Delete account data
      </button>
      <p>
        <Link to="/connections">Disconnect an integration</Link>
      </p>
    </section>
  );
}
