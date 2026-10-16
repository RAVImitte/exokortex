import { describe, expect, it } from "vitest";
import { analystReport, curatorClassification } from "./schemas.js";

describe("analyst report", () => {
  it("fills fields a small model leaves out", () => {
    const report = analystReport.parse({ summary: "only a summary" });
    expect(report.purpose).toBe("Not stated.");
    expect(report.architecture).toBe("Not stated.");
    expect(report.technologies).toEqual([]);
    expect(report.relationships).toEqual([]);
    expect(report.evidence).toEqual([]);
  });
});

describe("curator classification", () => {
  it("fills a missing reason and slug", () => {
    const report = curatorClassification.parse({ classification: "NEW_PROJECT" });
    expect(report.classification).toBe("NEW_PROJECT");
    expect(report.reason).toBe("No reason stated.");
    expect(report.projectSlug).toBeNull();
    expect(report.followupQuestion).toBeNull();
  });
});
