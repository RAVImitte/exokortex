export type RevisionComparison = "baseline" | "unchanged" | "changed";

export function compareRevisions(
  stored: string | null | undefined,
  latest: string,
): RevisionComparison {
  if (!stored) return "baseline";
  if (stored === latest) return "unchanged";
  return "changed";
}
