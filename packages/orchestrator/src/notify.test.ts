import { describe, expect, it } from "vitest";
import { approvalWaitingNotice, pullRequestOpenedNotice } from "./notify.js";

describe("email notices", () => {
  it("tells you an approval is waiting", () => {
    const notice = approvalWaitingNotice({
      action: "NEW_PROJECT",
      reason: "This repository is not in the portfolio.",
      repositoryName: "acme/api",
      approvalsUrl: "http://localhost:5173/approvals",
    });
    expect(notice.subject).toBe("New project waiting for approval");
    expect(notice.text).toContain("acme/api");
    expect(notice.text).toContain("http://localhost:5173/approvals");
  });

  it("tells you a pull request is ready to merge", () => {
    const notice = pullRequestOpenedNotice({
      projectName: "API",
      url: "https://github.com/acme/site/pull/4",
    });
    expect(notice.subject).toBe("Pull request opened for API");
    expect(notice.text).toContain("https://github.com/acme/site/pull/4");
    expect(notice.text).not.toContain("nothing changed");
  });
});
