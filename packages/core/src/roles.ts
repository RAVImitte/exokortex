export const REPOSITORY_ROLES = ["SOURCE", "PORTFOLIO", "EXCLUDED"] as const;
export type RepositoryRole = (typeof REPOSITORY_ROLES)[number];

export function isRepositoryRole(value: string): value is RepositoryRole {
  return (REPOSITORY_ROLES as readonly string[]).includes(value);
}
