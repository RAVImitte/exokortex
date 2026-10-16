import {
  Check,
  ExternalLink,
  GitPullRequest,
  Inbox,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api, messageOf } from "../api/client.js";
import type { ApprovalRow } from "../api/types.js";
import { useDashboard } from "../hooks/useDashboard.js";
import { fullDate, relativeTime } from "../time.js";
import { AnimatedItem, AnimatedList } from "../ui/AnimatedList.js";
import { Badge, humanize } from "../ui/Badge.js";
import { Button } from "../ui/Button.js";
import { EmptyState } from "../ui/EmptyState.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Segmented } from "../ui/Segmented.js";
import { SkeletonCards } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";

type Filter = "pending" | "all";

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const toast = useToast();
  const { refresh } = useDashboard();

  async function load() {
    const body = await api<{ approvals: ApprovalRow[] }>("/api/approvals");
    setApprovals(body.approvals);
    if (timer.current !== null) window.clearTimeout(timer.current);
    const waiting = body.approvals.some(
      (approval) =>
        approval.status === "approved" &&
        !pullRequestHref(approval.pullRequestUrl) &&
        !approval.engineerError,
    );
    timer.current = waiting
      ? window.setTimeout(() => void load().catch(() => undefined), 3000)
      : null;
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      setApprovals([]);
      toast.error(messageOf(err, "Failed to load approvals"));
    });
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function resolve(id: string, decision: "approved" | "rejected") {
    setBusy(`${id}:${decision}`);
    try {
      await api(`/api/approvals/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      toast.success(decision === "approved" ? "Approved." : "Rejected.");
      await Promise.all([load(), refresh()]);
    } catch (err) {
      toast.error(messageOf(err, "Could not resolve the approval"));
    } finally {
      setBusy(null);
    }
  }

  async function retry(id: string) {
    setBusy(`${id}:retry`);
    try {
      await api(`/api/approvals/${id}/retry`, { method: "POST" });
      toast.info("Trying the pull request again.");
      await load();
    } catch (err) {
      toast.error(messageOf(err, "Could not try the pull request again"));
    } finally {
      setBusy(null);
    }
  }

  const pendingCount = approvals?.filter((item) => item.status === "pending").length ?? 0;
  const visible = approvals?.filter((item) => filter === "all" || item.status === "pending") ?? [];

  return (
    <section>
      <PageHeader
        title="Approvals"
        description="Curator asks here before the portfolio changes. Approving the last item opens a pull request."
        actions={
          <Segmented
            label="Filter approvals"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "pending", label: `Waiting (${pendingCount})` },
              { value: "all", label: "All" },
            ]}
          />
        }
      />
      {approvals === null ? (
        <SkeletonCards />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === "pending" ? "Nothing is waiting on you" : "No approvals yet"}
        >
          Curator asks here when a change looks like a new or updated portfolio project.
        </EmptyState>
      ) : (
        <AnimatedList key={filter}>
          {visible.map((approval) => {
            const pullRequest = pullRequestHref(approval.pullRequestUrl);
            return (
              <AnimatedItem key={approval.id}>
                <motion.div layout className="card approval-card">
                  <div className="spread">
                    <div className="cluster">
                      <h3>{sentence(humanize(approval.action))}</h3>
                      <Badge>{approval.status}</Badge>
                    </div>
                    <span className="subtle" title={fullDate(approval.createdAt)}>
                      {relativeTime(approval.createdAt)}
                    </span>
                  </div>
                  {approval.reason ? <p className="approval-reason">{approval.reason}</p> : null}
                  <AnimatePresence mode="wait" initial={false}>
                    {pullRequest ? (
                      <motion.a
                        key="pr"
                        className="pr-link"
                        href={pullRequest}
                        target="_blank"
                        rel="noreferrer"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <GitPullRequest size={18} />
                        Pull request opened
                        <ExternalLink size={15} className="external" />
                      </motion.a>
                    ) : approval.engineerError ? (
                      <motion.div
                        key="failed"
                        className="approval-status failed"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <TriangleAlert size={18} style={{ flex: "none", marginTop: 2 }} />
                        <div className="stack-sm" style={{ flex: 1 }}>
                          <span>{approval.engineerError}</span>
                          <div>
                            <Button
                              size="sm"
                              icon={RefreshCw}
                              loading={busy === `${approval.id}:retry`}
                              onClick={() => void retry(approval.id)}
                            >
                              Try again
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ) : approval.status === "approved" ? (
                      <motion.div
                        key="working"
                        className="approval-status working"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <LoaderCircle size={18} className="spinner" />
                        Opening a pull request…
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  {approval.status === "pending" ? (
                    <div className="cluster">
                      <Button
                        variant="primary"
                        icon={Check}
                        loading={busy === `${approval.id}:approved`}
                        disabled={busy !== null}
                        onClick={() => void resolve(approval.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        icon={X}
                        loading={busy === `${approval.id}:rejected`}
                        disabled={busy !== null}
                        onClick={() => void resolve(approval.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}
    </section>
  );
}

function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pullRequestHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
