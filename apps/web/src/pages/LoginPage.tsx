import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, messageOf } from "../api/client.js";
import type { Me } from "../api/types.js";
import { Brand } from "../layout/Brand.js";
import { Button } from "../ui/Button.js";
import { Field, Input } from "../ui/Field.js";
import { Sculpture } from "../ui/Sculpture.js";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth auth-modern">
      <div className="auth-showcase">
        <Link to="/" aria-label="Back to ExoKortex website">
          <Brand />
        </Link>
        <div className="auth-message">
          <p>For the work that keeps moving.</p>
          <h2>
            Make room
            <br />
            for your
            <br />
            next chapter.
          </h2>
          <Sculpture />
        </div>
        <div className="auth-showcase-footer">
          <span>Your work. Thoughtfully collected.</span>
          <span>ExoKortex</span>
        </div>
      </div>
      <div className="auth-form-panel">
        <Link className="auth-back" to="/">
          Back to website
        </Link>
        <div className="auth-card">
          {children}
          <p className="auth-assurance">Your key. Your approval. Always your work.</p>
        </div>
        <span className="auth-form-footer">A living portfolio starts here.</span>
      </div>
    </div>
  );
}

export function LoginPage({ onDone }: { onDone: (me: Me) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      onDone(await api<Me>("/api/dev/login", { method: "POST", body: JSON.stringify({ email }) }));
    } catch (err) {
      setError(messageOf(err, "Could not sign in"));
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <div className="stack-sm">
          <h1>Welcome back</h1>
          <p className="muted">Keep your portfolio in step with the work you ship.</p>
        </div>
        <Field
          label="Email"
          error={error || undefined}
          hint="Local development sign-in. It is refused outside development."
        >
          {(id) => (
            <Input
              id={id}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              name="email"
              autoComplete="email"
              spellCheck={false}
              required
            />
          )}
        </Field>
        <Button type="submit" variant="primary" block loading={busy} icon={ArrowRight}>
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
