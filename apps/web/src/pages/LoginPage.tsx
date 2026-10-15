import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client.js";
import type { Me } from "../api/types.js";

export function LoginPage({ onDone }: { onDone: (me: Me) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onDone(await api<Me>("/api/dev/login", { method: "POST", body: JSON.stringify({ email }) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    }
  }

  return (
    <form className="login stack" onSubmit={(event) => void submit(event)}>
      <h1>ExoKortex</h1>
      <p className="muted">Local development sign-in. This mode is refused outside development.</p>
      <label>
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit">Continue</button>
    </form>
  );
}
