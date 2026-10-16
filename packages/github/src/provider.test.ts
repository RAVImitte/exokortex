import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAppJwt } from "./jwt.js";
import { GitHubProvider } from "./provider.js";
import { explainGitHubWriteError } from "./write-error.js";

function testKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

describe("GitHub app jwt", () => {
  it("signs a token whose payload names the app", async () => {
    const token = await createAppJwt("12345", testKey(), new Date("2026-10-16T00:00:00.000Z"));
    const payload = token.split(".")[1];
    expect(payload).toBeTruthy();
    const json = JSON.parse(Buffer.from(payload ?? "", "base64url").toString()) as { iss: string };
    expect(json.iss).toBe("12345");
  });
});

describe("GitHubProvider", () => {
  it("discovers repositories and reads the latest revision from fixtures", async () => {
    const pem = testKey();
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/access_tokens") && method === "POST") {
        return json({ token: "ghs_test" });
      }
      if (url.includes("/installation/repositories")) {
        return json({
          repositories: [
            {
              id: 7,
              full_name: "acme/api",
              html_url: "https://github.com/acme/api",
              default_branch: "main",
            },
          ],
        });
      }
      if (url.includes("/commits/main")) {
        return json({ sha: "abc123" });
      }
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({ appId: "12345", privateKeyPem: pem, fetch: fetchMock });
    const repos = await provider.discoverRepositories({ installationId: "99" });
    expect(repos).toEqual([
      {
        externalId: "7",
        name: "acme/api",
        url: "https://github.com/acme/api",
        defaultBranch: "main",
      },
    ]);
    const revision = await provider.getLatestRevision(
      { installationId: "99" },
      { externalId: "7", name: "acme/api", defaultBranch: "main" },
    );
    expect(revision).toEqual({ sha: "abc123", branch: "main" });
  });

  it("opens a pull request on a new branch and does not merge", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/access_tokens")) return json({ token: "ghs_test" });
      if (url.includes("/commits/main")) return json({ sha: "base" });
      if (url.includes("/git/refs") && method === "POST")
        return json({ ref: "refs/heads/exokortex/api" });
      if (url.includes("/contents/") && method === "GET") {
        return new Response("missing", { status: 404 });
      }
      if (url.includes("/contents/") && method === "PUT") return json({ content: { sha: "new" } });
      if (url.includes("/pulls") && method === "POST") {
        return json({ html_url: "https://github.com/acme/site/pull/4" });
      }
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({
      appId: "12345",
      privateKeyPem: testKey(),
      fetch: fetchMock,
    });
    const pull = await provider.openPullRequest({
      connection: { installationId: "99" },
      repository: { externalId: "7", name: "acme/site", defaultBranch: "main" },
      branch: "exokortex/api",
      path: "src/data/projects.json",
      content: "[]",
      commitMessage: "Add API",
      prTitle: "Add API",
      prBody: "Adds the approved project.",
    });
    expect(pull.url).toBe("https://github.com/acme/site/pull/4");
    expect(calls.some((call) => call.url.includes("/merges"))).toBe(false);
    expect(calls.some((call) => call.method === "PUT" && call.url.includes("/contents/"))).toBe(
      true,
    );
  });
});

describe("GitHub write errors", () => {
  it("explains a missing write permission", () => {
    expect(explainGitHubWriteError("GitHub /repos/acme/site/git/refs returned 403")).toBe(
      "GitHub refused to open the pull request. Set Contents and Pull requests to Read and write on the GitHub App, save, and approve that request on the installation. Then try again.",
    );
    expect(explainGitHubWriteError("GitHub /repos/acme/site/pulls returned 422")).toBe(
      "GitHub /repos/acme/site/pulls returned 422",
    );
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
