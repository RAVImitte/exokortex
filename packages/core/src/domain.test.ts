import { describe, expect, it } from "vitest";
import { isExcludedFromDiscovery, normalizeRepoUrl, suggestsPortfolio } from "./exclusion.js";
import { addFrequency } from "./limits.js";
import { compareRevisions } from "./revisions.js";
import { assertTransition } from "./workflow.js";

describe("compareRevisions", () => {
  it("treats a missing revision as a baseline", () => {
    expect(compareRevisions(null, "abc")).toBe("baseline");
    expect(compareRevisions(undefined, "abc")).toBe("baseline");
  });

  it("detects equal and different revisions", () => {
    expect(compareRevisions("abc", "abc")).toBe("unchanged");
    expect(compareRevisions("abc", "def")).toBe("changed");
  });
});

describe("portfolio exclusion", () => {
  const known = {
    ids: new Set(["repo_portfolio"]),
    urls: new Set([normalizeRepoUrl("https://github.com/acme/site")]),
  };

  it("excludes by role, id, and url", () => {
    expect(
      isExcludedFromDiscovery(
        { id: "a", url: "https://github.com/acme/app", role: "PORTFOLIO" },
        known,
      ),
    ).toBe(true);
    expect(
      isExcludedFromDiscovery(
        { id: "a", url: "https://github.com/acme/app", role: "EXCLUDED" },
        known,
      ),
    ).toBe(true);
    expect(
      isExcludedFromDiscovery(
        { id: "repo_portfolio", url: "https://github.com/acme/other", role: "SOURCE" },
        known,
      ),
    ).toBe(true);
    expect(
      isExcludedFromDiscovery(
        { id: "b", url: "https://github.com/acme/site.git/", role: "SOURCE" },
        known,
      ),
    ).toBe(true);
  });

  it("keeps an ordinary source repository", () => {
    expect(
      isExcludedFromDiscovery(
        { id: "c", url: "https://github.com/acme/api", role: "SOURCE" },
        known,
      ),
    ).toBe(false);
  });

  it("only suggests a portfolio name, it does not exclude on the name alone", () => {
    expect(suggestsPortfolio("acme/portfolio")).toBe(true);
    expect(suggestsPortfolio("acme/api")).toBe(false);
  });
});

describe("workflow transitions", () => {
  it("allows the scan path", () => {
    expect(assertTransition("SCAN_PENDING", "SCANNING")).toBe("SCANNING");
    expect(assertTransition("SCANNING", "COMPLETED")).toBe("COMPLETED");
    expect(assertTransition("SCANNING", "CURATING")).toBe("CURATING");
    expect(assertTransition("CURATING", "PENDING_APPROVAL")).toBe("PENDING_APPROVAL");
  });

  it("rejects an illegal transition", () => {
    expect(() => assertTransition("COMPLETED", "SCANNING")).toThrow(/Illegal workflow transition/);
    expect(() => assertTransition("SCAN_PENDING", "ENGINEERING")).toThrow(
      /Illegal workflow transition/,
    );
  });
});

describe("scan frequency", () => {
  it("adds weeks and months in UTC", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    expect(addFrequency(start, "weekly").toISOString()).toBe("2026-10-08T00:00:00.000Z");
    expect(addFrequency(start, "biweekly").toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(addFrequency(start, "monthly").toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
});
