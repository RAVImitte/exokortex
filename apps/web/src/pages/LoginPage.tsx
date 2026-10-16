import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, messageOf } from "../api/client.js";
import type { Me } from "../api/types.js";
import { Brand } from "../layout/Brand.js";
import { Button } from "../ui/Button.js";
import { Field, Input } from "../ui/Field.js";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <motion.div
        className="auth-glow auth-glow-1"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="auth-glow auth-glow-2"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="card auth-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Brand />
        {children}
      </motion.div>
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
              autoFocus
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
