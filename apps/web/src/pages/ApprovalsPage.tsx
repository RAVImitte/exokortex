import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import type { ApprovalRow } from "../api/types.js";

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const body = await api<{ approvals: ApprovalRow[] }>("/api/approvals");
    setApprovals(body.approvals);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
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

  return (
    <section>
      <h1>Approvals</h1>
      {error ? <p>{error}</p> : null}
      {approvals.length === 0 ? (
        <p className="muted">No approvals yet. Curator asks here before a new project is added.</p>
      ) : null}
      <ul>
        {approvals.map((approval) => (
          <li key={approval.id}>
            {approval.action} · {approval.status}
            {approval.reason ? <div>{approval.reason}</div> : null}
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
        ))}
      </ul>
    </section>
  );
}
