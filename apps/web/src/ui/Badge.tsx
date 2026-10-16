import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const tones: Record<string, Tone> = {
  open: "info",
  analyzed: "accent",
  curated: "success",
  ignored: "neutral",
  noise: "neutral",
  low: "neutral",
  medium: "warning",
  high: "danger",
  pending: "warning",
  approved: "success",
  rejected: "neutral",
  active: "success",
  revoked: "neutral",
  new_project: "accent",
  updated_project: "info",
  unchanged: "neutral",
  ignore: "neutral",
  portfolio: "accent",
  source: "neutral",
  excluded: "neutral",
};

export function toneFor(value: string | null | undefined): Tone {
  return (value && tones[value.toLowerCase()]) || "neutral";
}

export function humanize(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

export function Badge({
  tone,
  plain = false,
  children,
}: {
  tone?: Tone;
  plain?: boolean;
  children: ReactNode;
}) {
  const resolved = tone ?? (typeof children === "string" ? toneFor(children) : "neutral");
  return (
    <span className={`badge badge-${resolved}${plain ? " badge-plain" : ""}`}>
      {typeof children === "string" ? humanize(children) : children}
    </span>
  );
}
