import { Monitor, Moon, Save, Sun, Trash } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, messageOf } from "../api/client.js";
import type { Me } from "../api/types.js";
import { useTheme } from "../theme.js";
import { Button } from "../ui/Button.js";
import { Card } from "../ui/Card.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Field, Select } from "../ui/Field.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Segmented } from "../ui/Segmented.js";
import { Skeleton } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";

type Frequency = "weekly" | "biweekly" | "monthly";

export function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [timezone, setTimezone] = useState("UTC");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { choice, setChoice } = useTheme();
  const toast = useToast();

  useEffect(() => {
    api<Me>("/api/me")
      .then((body) => {
        setMe(body);
        setTimezone(body.timezone);
        setFrequency(body.scanFrequency as Frequency);
      })
      .catch(() => undefined);
  }, []);

  const zones = useMemo(() => {
    const list = Intl.supportedValuesOf("timeZone");
    return list.includes(timezone) ? list : [timezone, ...list];
  }, [timezone]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ timezone, scanFrequency: frequency }),
      });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(messageOf(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    try {
      await api("/api/account", { method: "DELETE" });
      window.location.assign("/");
    } catch (err) {
      toast.error(messageOf(err, "Could not delete the account"));
    }
  }

  return (
    <section>
      <PageHeader title="Settings" description="Scanning schedule, appearance, and your account." />
      <div className="settings-section">
        <div>
          <h2>Scanning</h2>
          <p>How often ExoKortex checks your sources for new revisions.</p>
        </div>
        <Card>
          {me === null ? (
            <div className="stack">
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          ) : (
            <form className="stack" onSubmit={(event) => void save(event)}>
              <div className="field">
                <span className="field-label">Scan frequency</span>
                <div>
                  <Segmented
                    label="Scan frequency"
                    value={frequency}
                    onChange={setFrequency}
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "biweekly", label: "Every 2 weeks" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                  />
                </div>
              </div>
              <Field label="Timezone">
                {(id) => (
                  <Select
                    id={id}
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                  >
                    {zones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div>
                <Button type="submit" variant="primary" icon={Save} loading={saving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
      <div className="settings-section">
        <div>
          <h2>Appearance</h2>
          <p>System follows your operating system setting.</p>
        </div>
        <Card>
          <Segmented
            label="Theme"
            value={choice}
            onChange={setChoice}
            options={[
              { value: "system", label: "System", icon: Monitor },
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ]}
          />
        </Card>
      </div>
      <div className="settings-section">
        <div>
          <h2>Account</h2>
          <p>{me?.email ?? ""}</p>
        </div>
        <Card className="danger-zone">
          <div className="stack">
            <div>
              <h3>Delete account data</h3>
              <p className="muted">
                Removes your repositories, connections, projects, approvals, and settings. This
                cannot be undone. To stop one source instead, disconnect it on Connections.
              </p>
            </div>
            <div>
              <Button variant="danger" icon={Trash} onClick={() => setDeleting(true)}>
                Delete account data
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={deleting}
        title="Delete all account data?"
        confirmLabel="Delete everything"
        danger
        requireText="delete"
        onClose={() => setDeleting(false)}
        onConfirm={deleteAccount}
      >
        Every row that belongs to you is removed. Pull requests already opened on GitHub stay.
      </ConfirmDialog>
    </section>
  );
}
