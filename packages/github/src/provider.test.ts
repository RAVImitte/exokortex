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

  it("signs a token from the PKCS1 key GitHub downloads", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    const token = await createAppJwt("99", pem, new Date("2026-10-16T00:00:00.000Z"));
    const payload = token.split(".")[1] ?? "";
    const json = JSON.parse(Buffer.from(payload, "base64url").toString()) as { iss: string };
    expect(json.iss).toBe("99");
  });
});

describe("GitHubProvider", () => {
  it("reads from the selected branch and honors explicit revisions", async () => {
    const paths: string[] = [];
    const provider = new GitHubProvider({
      appId: "1",
      privateKeyPem: testKey(),
      fetch: async (input) => {
        paths.push(String(input));
        return String(input).includes("/access_tokens")
          ? json({ token: "test" })
          : json({ content: "e30=", encoding: "base64" });
      },
    });
    const repository = { externalId: "7", name: "acme/site", defaultBranch: "release/v2" };
    await provider.getFile({ installationId: "99" }, repository, "project data.json");
    await provider.getFile({ installationId: "99" }, repository, "projects.json", "commit123");
    expect(paths).toContain(
      "https://api.github.com/repos/acme/site/contents/project%20data.json?ref=release%2Fv2",
    );
    expect(paths).toContain(
      "https://api.github.com/repos/acme/site/contents/projects.json?ref=commit123",
    );
  });
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

describe("publishFiles", () => {
  it("commits every file on one branch and opens one pull request", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/access_tokens")) return json({ token: "ghs_test" });
      if (url.endsWith("/commits/main")) {
        return json({ sha: "base", commit: { tree: { sha: "tree-base" } } });
      }
      if (url.endsWith("/git/blobs")) return json({ sha: `blob-${calls.length}` });
      if (url.endsWith("/git/trees")) return json({ sha: "tree-new" });
      if (url.endsWith("/git/commits")) return json({ sha: "commit-new" });
      if (url.endsWith("/git/refs") && method === "POST") return json({ ref: "ok" });
      if (url.endsWith("/pulls") && method === "POST") {
        return json({ html_url: "https://github.com/acme/site/pull/8" });
      }
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({
      appId: "12345",
      privateKeyPem: testKey(),
      fetch: fetchMock,
    });
    const published = await provider.publishFiles({
      connection: { installationId: "99" },
      repository: { externalId: "7", name: "acme/site", defaultBranch: "main" },
      branch: "exokortex/portfolio-seed",
      files: [
        { path: "exokortex.json", content: "{}" },
        { path: "src/content/projects/ledger.json", content: "{}" },
      ],
      commitMessage: "Add a portfolio",
      prTitle: "Build the portfolio",
      prBody: "Extracted repositories.",
    });
    expect(published).toEqual({
      url: "https://github.com/acme/site/pull/8",
      pullRequest: true,
    });
    expect(calls.filter((call) => call.url.endsWith("/git/blobs"))).toHaveLength(0);
    expect(calls.filter((call) => call.url.endsWith("/git/trees"))).toHaveLength(1);
    expect(calls.some((call) => call.url.includes("/merges"))).toBe(false);
  });

  it("writes the first file before committing an empty repository", async () => {
    const calls: { url: string; method: string }[] = [];
    let heads = 0;
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/access_tokens")) return json({ token: "ghs_test" });
      if (url.endsWith("/commits/main")) {
        heads += 1;
        if (heads === 1) return new Response("empty", { status: 409 });
        return json({ sha: "seed", commit: { tree: { sha: "tree-seed" } } });
      }
      if (url.includes("/contents/") && method === "PUT")
        return json({ content: { sha: "first" } });
      if (url.endsWith("/git/trees")) return json({ sha: "tree-new" });
      if (url.endsWith("/git/commits")) return json({ sha: "commit-new" });
      if (url.endsWith("/git/refs") && method === "POST")
        return new Response("exists", { status: 422 });
      if (url.includes("/git/refs/heads/") && method === "PATCH") return json({ ref: "ok" });
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({
      appId: "12345",
      privateKeyPem: testKey(),
      fetch: fetchMock,
    });
    const published = await provider.publishFiles({
      connection: { installationId: "99" },
      repository: { externalId: "7", name: "acme/portfolio", defaultBranch: "main" },
      branch: "exokortex/portfolio-seed",
      files: [
        { path: "exokortex.json", content: "{}" },
        { path: "src/content/projects/ledger.json", content: "{}" },
      ],
      commitMessage: "Add a portfolio",
      prTitle: "Build the portfolio",
      prBody: "Extracted repositories.",
    });
    expect(published).toEqual({
      url: "https://github.com/acme/portfolio",
      pullRequest: false,
    });
    expect(calls.some((call) => call.method === "PUT" && call.url.includes("/contents/"))).toBe(
      true,
    );
    expect(calls.some((call) => call.url.includes("/pulls"))).toBe(false);
  });

  it("decodes repository files when GitHub wraps the base64", async () => {
    const wrapped = Buffer.from("hello\n", "utf8")
      .toString("base64")
      .replace(/(.{4})/g, "$1\n");
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/access_tokens") && method === "POST") return json({ token: "ghs_test" });
      if (url.includes("/contents/README.md")) {
        return json({ encoding: "base64", content: wrapped });
      }
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({
      appId: "12345",
      privateKeyPem: testKey(),
      fetch: fetchMock,
    });
    const file = await provider.getFile(
      { installationId: "99" },
      { externalId: "7", name: "acme/api", defaultBranch: "main" },
      "README.md",
    );
    expect(file.content).toBe("hello\n");
  });
});

describe("createRepository", () => {
  it("creates a repository on the installed user account", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/app/installations/99") && method === "GET") {
        return json({ account: { login: "acme", type: "User" } });
      }
      if (url.includes("/access_tokens")) return json({ token: "ghs_test" });
      if (url.endsWith("/user/repos") && method === "POST") {
        return json({
          id: 42,
          full_name: "acme/portfolio",
          html_url: "https://github.com/acme/portfolio",
          default_branch: "main",
        });
      }
      return new Response("missing fixture", { status: 404 });
    };
    const provider = new GitHubProvider({
      appId: "12345",
      privateKeyPem: testKey(),
      fetch: fetchMock,
    });
    const repo = await provider.createRepository({
      connection: { installationId: "99" },
      name: "portfolio",
      description: "Portfolio",
    });
    expect(repo).toEqual({
      externalId: "42",
      name: "acme/portfolio",
      url: "https://github.com/acme/portfolio",
      defaultBranch: "main",
    });
    expect(calls.some((call) => call.url.endsWith("/user/repos") && call.method === "POST")).toBe(
      true,
    );
  });
});

describe("GitHub write errors", () => {
  it("explains a missing write permission", () => {
    expect(explainGitHubWriteError("GitHub /repos/acme/site/git/refs returned 403")).toBe(
      "GitHub refused to open the pull request. Set Contents and Pull requests to Read and write on the GitHub App, save, and approve that request on the installation. Then try again.",
    );
    expect(explainGitHubWriteError("GitHub /user/repos returned 403")).toBe(
      "GitHub refused to create the repository. Set Repository creation to Read and write on the GitHub App, save, and approve that permission on the installation. Then try again.",
    );
    expect(explainGitHubWriteError("Too many subrequests.")).toBe(
      "Building the portfolio made too many GitHub requests. Try again.",
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
