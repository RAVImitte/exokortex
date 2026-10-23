import { Activity, Bot, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api, messageOf } from "../api/client.js";
import type { ChangeRow } from "../api/types.js";
import { AnimatedItem, AnimatedList } from "../ui/AnimatedList.js";
import { Button } from "../ui/Button.js";
import { ChangeCard, ChangeDot } from "../ui/ChangeCard.js";
import { EmptyState } from "../ui/EmptyState.js";
import { BuildPortfolioButton } from "../ui/BuildPortfolioButton.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Segmented } from "../ui/Segmented.js";
import { SkeletonCards } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";

type Filter = "all" | "open" | "analyzed" | "ignored";

export function ActivityPage() {
  const [changes, setChanges] = useState<ChangeRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    api<{ changes: ChangeRow[] }>("/api/changes")
      .then((body) => setChanges(body.changes))
      .catch(() => setChanges([]));
  }, []);

  async function run(changeId: string, step: "analyze" | "curate") {
    setBusy(changeId);
    try {
      await api(`/api/changes/${changeId}/${step}`, { method: "POST" });
      toast.success(
        step === "analyze"
          ? "Analysis queued."
          : "Curator queued. Open Approvals after it finishes.",
      );
    } catch (err) {
      toast.error(messageOf(err, step === "analyze" ? "Analyze failed" : "Curator failed"));
    } finally {
      setBusy(null);
    }
  }

  const visible = changes?.filter((change) => filter === "all" || change.status === filter) ?? [];

  return (
    <section>
      <PageHeader
        title="Activity"
        description="Every change ExoKortex has seen, and what the agents made of it."
        actions={
          <Segmented
            label="Filter activity"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "analyzed", label: "Analyzed" },
              { value: "ignored", label: "Ignored" },
            ]}
          />
        }
      />
      {changes === null ? (
        <SkeletonCards count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={changes.length === 0 ? "No changes yet" : "Nothing here"}
          action={changes.length === 0 ? <BuildPortfolioButton variant="primary" /> : undefined}
        >
          {changes.length === 0
            ? "The first scan only records a baseline. Extract the connected repositories into the example portfolio template. If none is marked as the portfolio, ExoKortex creates a new repository."
            : "No changes match this filter."}
        </EmptyState>
      ) : (
        <AnimatedList key={filter} className="timeline">
          {visible.map((change) => {
            const canAnalyze =
              change.status === "ignored" ||
              (change.status === "open" && change.significance === "noise");
            return (
              <AnimatedItem key={change.id} className="timeline-item">
                <ChangeDot status={change.status} />
                <ChangeCard
                  {...change}
                  actions={
                    canAnalyze ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Sparkles}
                        loading={busy === change.id}
                        onClick={() => void run(change.id, "analyze")}
                      >
                        Run analysis
                      </Button>
                    ) : change.status === "analyzed" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Bot}
                        loading={busy === change.id}
                        onClick={() => void run(change.id, "curate")}
                      >
                        Run curator
                      </Button>
                    ) : null
                  }
                />
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}
    </section>
  );
}
