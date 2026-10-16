import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { fullDate, relativeTime } from "../time.js";
import { Badge } from "./Badge.js";

const dotTone: Record<string, string> = {
  open: "tone-info",
  analyzed: "tone-accent",
  ignored: "",
};

export function ChangeDot({ status }: { status: string }) {
  return <span className={`timeline-dot ${dotTone[status] ?? ""}`} aria-hidden="true" />;
}

export function ChangeCard({
  repositoryName,
  fromRevision,
  toRevision,
  significance,
  status,
  classification,
  summary,
  createdAt,
  actions,
}: {
  repositoryName?: string;
  fromRevision: string;
  toRevision: string;
  significance: string | null;
  status: string;
  classification?: string | null;
  summary: string | null;
  createdAt: string;
  actions?: ReactNode;
}) {
  return (
    <div className="card event-card">
      <div className="event-head">
        <span className="event-title">{repositoryName ?? "Repository"}</span>
        <Badge>{status}</Badge>
        {significance ? <Badge plain>{significance}</Badge> : null}
        {classification ? <Badge>{classification}</Badge> : null}
      </div>
      {summary ? <p className="event-summary">{summary}</p> : null}
      <div className="event-meta">
        <span className="revision">
          {fromRevision.slice(0, 7)}
          <ArrowRight size={12} />
          {toRevision.slice(0, 7)}
          <span className="subtle" title={fullDate(createdAt)}>
            · {relativeTime(createdAt)}
          </span>
        </span>
        {actions ? <div className="cluster">{actions}</div> : null}
      </div>
    </div>
  );
}
