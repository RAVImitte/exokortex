import { Plus, Unplug, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { api, messageOf } from "../api/client.js";
import type { ConnectionRow } from "../api/types.js";
import { AnimatedCell, AnimatedGrid } from "../ui/AnimatedList.js";
import { Badge } from "../ui/Badge.js";
import { Button, ButtonAnchor, IconButton } from "../ui/Button.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Field, SecretInput } from "../ui/Field.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Skeleton } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";
import { providers, useConnectedToast } from "../ui/providers.js";

type TokenProvider = "huggingface" | "kaggle";

const tokenForms: Record<TokenProvider, { label: string; placeholder: string; hint: string }> = {
  huggingface: {
    label: "Read token",
    placeholder: "hf_...",
    hint: "Create a read token in your Hugging Face settings. It is encrypted and never shown again.",
  },
  kaggle: {
    label: "API token",
    placeholder: "KGAT_...",
    hint: "Create an API token in your Kaggle settings. It is encrypted and never shown again.",
  },
};

const order = ["github", "google", "huggingface", "kaggle"] as const;

export function ConnectionsPage() {
  const [rows, setRows] = useState<ConnectionRow[] | null>(null);
  const [disconnecting, setDisconnecting] = useState<ConnectionRow | null>(null);
  const toast = useToast();
  useConnectedToast();

  async function load() {
    const body = await api<{ connections: ConnectionRow[] }>("/api/connections");
    setRows(body.connections);
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      setRows([]);
      toast.error(messageOf(err, "Failed to load connections"));
    });
  }, [toast]);

  async function disconnect(row: ConnectionRow) {
    try {
      await api(`/api/connections/${row.id}`, { method: "DELETE" });
      setRows(
        (current) =>
          current?.map((item) => (item.id === row.id ? { ...item, status: "revoked" } : item)) ??
          null,
      );
      toast.success(`${providers[row.provider]?.label ?? row.provider} disconnected.`);
    } catch (err) {
      toast.error(messageOf(err, "Could not disconnect"));
    }
  }

  return (
    <section>
      <PageHeader
        title="Connections"
        description="Where ExoKortex reads your work. Credentials are encrypted and never shown again."
      />
      {rows === null ? (
        <div className="provider-grid">
          {order.map((key) => (
            <Skeleton key={key} height={160} radius={14} />
          ))}
        </div>
      ) : (
        <AnimatedGrid className="provider-grid">
          {order.map((key) => (
            <AnimatedCell key={key}>
              <ProviderCard
                provider={key}
                accounts={rows.filter((row) => row.provider === key && row.status === "active")}
                onConnected={load}
                onDisconnect={setDisconnecting}
              />
            </AnimatedCell>
          ))}
        </AnimatedGrid>
      )}
      <ConfirmDialog
        open={disconnecting !== null}
        title={`Disconnect ${disconnecting ? (providers[disconnecting.provider]?.label ?? disconnecting.provider) : ""}?`}
        confirmLabel="Disconnect"
        danger
        onClose={() => setDisconnecting(null)}
        onConfirm={() => (disconnecting ? disconnect(disconnecting) : undefined)}
      >
        The stored credential is cleared. Repositories from this connection stop being scanned.
      </ConfirmDialog>
    </section>
  );
}

function ProviderCard({
  provider,
  accounts,
  onConnected,
  onDisconnect,
}: {
  provider: (typeof order)[number];
  accounts: ConnectionRow[];
  onConnected: () => Promise<void>;
  onDisconnect: (row: ConnectionRow) => void;
}) {
  const meta = providers[provider]!;
  const Icon = meta.icon;
  const connected = accounts.length > 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="card provider-card">
      <div className="provider-head">
        <span className="provider-icon lg">
          <Icon size={20} />
        </span>
        <div>
          <div className="cluster">
            <h3>{meta.label}</h3>
            {connected ? <Badge tone="success">connected</Badge> : null}
          </div>
          <p>{meta.description}</p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {accounts.length > 0 ? (
          <motion.ul
            className="accounts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatePresence initial={false}>
              {accounts.map((row) => (
                <motion.li
                  key={row.id}
                  className="account-row"
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                >
                  <span className="name">
                    {row.externalUserId ??
                      (row.externalInstallationId
                        ? `Installation ${row.externalInstallationId}`
                        : "Account")}
                  </span>
                  <IconButton
                    icon={Unplug}
                    label="Disconnect"
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => onDisconnect(row)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : null}
      </AnimatePresence>
      {provider === "github" || provider === "google" ? (
        <div>
          <ButtonAnchor
            href={`/api/${provider}/install`}
            variant={connected ? "secondary" : "primary"}
            icon={connected ? Plus : undefined}
          >
            {connected ? "Add another" : `Connect ${meta.label}`}
          </ButtonAnchor>
        </div>
      ) : (
        <>
          <div>
            <Button
              variant={connected || open ? "secondary" : "primary"}
              icon={open ? X : connected ? Plus : undefined}
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? "Cancel" : connected ? "Add another" : `Connect ${meta.label}`}
            </Button>
          </div>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                className="collapse"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <TokenForm
                  provider={provider}
                  onDone={async () => {
                    setOpen(false);
                    await onConnected();
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function TokenForm({ provider, onDone }: { provider: TokenProvider; onDone: () => Promise<void> }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const form = tokenForms[provider];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ username: string; repositories: number }>(
        `/api/${provider}/connect`,
        { method: "POST", body: JSON.stringify({ token }) },
      );
      setToken("");
      toast.success(`Connected ${body.username}. ${body.repositories} repositories stored.`);
      await onDone();
    } catch (err) {
      setError(messageOf(err, "Connection failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" style={{ paddingTop: 4 }} onSubmit={(event) => void submit(event)}>
      <Field label={form.label} hint={form.hint} error={error || undefined}>
        {(id) => (
          <SecretInput
            id={id}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={form.placeholder}
            autoFocus
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="primary" loading={busy} disabled={!token.trim()}>
          Connect
        </Button>
      </div>
    </form>
  );
}
