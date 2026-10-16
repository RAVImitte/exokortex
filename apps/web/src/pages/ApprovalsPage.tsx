import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import type { ApprovalRow } from "../api/types.js";

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);

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
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function resolve(id: string, decision: "approved" | "rejected") {
    setError("");
    try {
      await api(`/api/approvals/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve the approval");
    }
  }

  async function retry(id: string) {
    setError("");
    try {
      await api(`/api/approvals/${id}/retry`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not try the pull request again");
    }
  }

  return (
    <section>
      <h1>Approvals</h1>
      {error ? <p>{error}</p> : null}
      {approvals.length === 0 ? (
        <p className="muted">No approvals yet. Curator asks here before a new project is added.</p>
      ) : null}
      <ul>
        {approvals.map((approval) => {
          const pullRequest = pullRequestHref(approval.pullRequestUrl);
          return (
            <li key={approval.id}>
              {approval.action} · {approval.status}
              {approval.reason ? <div>{approval.reason}</div> : null}
              {pullRequest ? (
                <div>
                  <a href={pullRequest}>Pull request</a>
                </div>
              ) : approval.engineerError ? (
                <div>
                  <p className="error">{approval.engineerError}</p>
                  <button type="button" onClick={() => void retry(approval.id)}>
                    Try again
                  </button>
                </div>
              ) : approval.status === "approved" ? (
                <div className="muted">Opening a pull request.</div>
              ) : null}
              {approval.status === "pending" ? (
                <div>
                  <button type="button" onClick={() => void resolve(approval.id, "approved")}>
                    Approve
                  </button>{" "}
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => void resolve(approval.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
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
