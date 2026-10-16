import { describe, expect, it } from "vitest";
import { GoogleProvider, googleAccessToken, googleAuthorization } from "./provider.js";

const notebook = {
  externalId: "drive/file-1",
  name: "Train a model",
  defaultBranch: "main",
};

describe("GoogleProvider", () => {
  it("discovers Colab notebooks the account owns", async () => {
    const provider = new GoogleProvider({ accessToken: "ya29.test", fetch: mockFetch() });
    await expect(provider.account()).resolves.toEqual({ id: "google-1", email: "ada@example.com" });
    await expect(provider.discoverRepositories({ installationId: "google-1" })).resolves.toEqual([
      {
        externalId: "drive/file-1",
        name: "Train a model",
        url: "https://colab.research.google.com/drive/file-1",
        defaultBranch: "main",
      },
    ]);
  });

  it("reads the head revision and names the notebook when it changes", async () => {
    const provider = new GoogleProvider({ accessToken: "ya29.test", fetch: mockFetch() });
    await expect(
      provider.getLatestRevision({ installationId: "google-1" }, notebook),
    ).resolves.toEqual({ sha: "rev-2", branch: "main" });
    await expect(
      provider.getChanges({ installationId: "google-1" }, notebook, "rev-1", "rev-2"),
    ).resolves.toEqual([{ path: "Train a model.ipynb", status: "modified" }]);
  });

  it("reads notebook text with the access token and does not repeat secrets", async () => {
    const calls: { url: string; authorization: string; body: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization") ?? "",
        body:
          init?.body instanceof URLSearchParams
            ? init.body.toString()
            : typeof init?.body === "string"
              ? init.body
              : "",
      });
      return mockFetch()(input, init);
    };
    const provider = new GoogleProvider({ accessToken: "ya29.secret", fetch: fetchImpl });
    await expect(
      provider.getFile({ installationId: "google-1" }, notebook, "Train a model.ipynb"),
    ).resolves.toEqual({ path: "Train a model.ipynb", content: '{"cells":[]}' });
    expect(calls.every((call) => call.authorization === "Bearer ya29.secret")).toBe(true);

    await expect(
      googleAccessToken({
        clientId: "client",
        clientSecret: "client-secret",
        refreshToken: "refresh-secret",
        fetch: fetchImpl,
      }),
    ).resolves.toBe("ya29.minted");
    const refresh = calls.find((call) => call.url.includes("oauth2.googleapis.com"));
    expect(refresh?.body.includes("refresh-secret")).toBe(true);
    await expect(
      googleAuthorization({
        clientId: "client",
        clientSecret: "client-secret",
        code: "auth-code",
        redirectUri: "http://localhost:5173/api/google/callback",
        fetch: async () => new Response("no", { status: 400 }),
      }),
    ).rejects.toThrow(/returned 400/);
  });
});

function mockFetch(): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (url.includes("/oauth2/v2/userinfo"))
      return json({ id: "google-1", email: "ada@example.com" });
    if (url.includes("/drive/v3/files?")) {
      return json({
        files: [{ id: "file-1", name: "Train a model", webViewLink: "http://evil.example/file" }],
      });
    }
    if (url.includes("fields=headRevisionId")) return json({ headRevisionId: "rev-2" });
    if (url.includes("alt=media")) return new Response('{"cells":[]}', { status: 200 });
    if (url.includes("oauth2.googleapis.com/token") && init?.method === "POST") {
      return json({ access_token: "ya29.minted" });
    }
    return new Response("missing", { status: 404 });
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
