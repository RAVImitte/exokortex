import { describe, expect, it } from "vitest";
import { scanRepositories, type ScanRepo } from "./scan.js";

function repo(overrides: Partial<ScanRepo> = {}): ScanRepo {
  return {
    id: "repo_1",
    name: "acme/api",
    url: "https://github.com/acme/api",
    role: "SOURCE",
    defaultBranch: "main",
    lastRevision: null,
    externalId: "1",
    ...overrides,
  };
}

describe("scanRepositories", () => {
  it("baselines first, records one change, then ignores a repeat", async () => {
    const scanned: { id: string; revision: string }[] = [];
    const changes: { from: string; to: string }[] = [];
    const known = { ids: new Set<string>(), urls: new Set<string>() };

    const first = await scanRepositories({
      repos: [repo(), repo({ id: "port", role: "PORTFOLIO", url: "https://github.com/acme/site" })],
      known,
      getLatestRevision: async () => "sha-1",
      markScanned: async (id, revision) => {
        scanned.push({ id, revision });
      },
      insertChange: async () => "created",
    });
    expect(first).toEqual({ baselined: 1, unchanged: 0, changed: 0, skipped: 1 });
    expect(scanned.map((item) => item.id)).toEqual(["repo_1"]);

    scanned.length = 0;
    const second = await scanRepositories({
      repos: [repo({ lastRevision: "sha-1" })],
      known,
      getLatestRevision: async () => "sha-2",
      markScanned: async (id, revision) => {
        scanned.push({ id, revision });
      },
      insertChange: async (id, from, to) => {
        changes.push({ from, to });
        return "created";
      },
    });
    expect(second.changed).toBe(1);
    expect(changes).toEqual([{ from: "sha-1", to: "sha-2" }]);

    const third = await scanRepositories({
      repos: [repo({ lastRevision: "sha-2" })],
      known,
      getLatestRevision: async () => "sha-2",
      markScanned: async () => undefined,
      insertChange: async () => {
        throw new Error("should not insert");
      },
    });
    expect(third).toEqual({ baselined: 0, unchanged: 1, changed: 0, skipped: 0 });
  });

  it("does not create a second change event for the same revision pair", async () => {
    const summary = await scanRepositories({
      repos: [repo({ lastRevision: "sha-1" })],
      known: { ids: new Set(), urls: new Set() },
      getLatestRevision: async () => "sha-2",
      markScanned: async () => undefined,
      insertChange: async () => "exists",
    });
    expect(summary.changed).toBe(0);
    expect(summary.unchanged).toBe(1);
  });
});
