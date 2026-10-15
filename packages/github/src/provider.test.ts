import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAppJwt } from "./jwt.js";
import { GitHubProvider } from "./provider.js";

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
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
