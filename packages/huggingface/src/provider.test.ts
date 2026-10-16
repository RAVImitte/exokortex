import { describe, expect, it } from "vitest";
import { HuggingFaceProvider } from "./provider.js";

const repo = {
  externalId: "models/ada/bert",
  name: "ada/bert",
  defaultBranch: "main",
};

describe("HuggingFaceProvider", () => {
  it("discovers the account's models, datasets, and spaces", async () => {
    const provider = new HuggingFaceProvider({ token: "hf_test", fetch: mockFetch() });
    await expect(provider.whoami()).resolves.toEqual({ username: "ada" });
    const found = await provider.discoverRepositories({ installationId: "ada" });
    expect(found).toEqual([
      {
        externalId: "models/ada/bert",
        name: "ada/bert",
        url: "https://huggingface.co/ada/bert",
        defaultBranch: "main",
      },
      {
        externalId: "datasets/ada/notes",
        name: "datasets/ada/notes",
        url: "https://huggingface.co/datasets/ada/notes",
        defaultBranch: "main",
      },
      {
        externalId: "spaces/ada/demo",
        name: "spaces/ada/demo",
        url: "https://huggingface.co/spaces/ada/demo",
        defaultBranch: "main",
      },
    ]);
  });

  it("reads the latest commit and diffs file ids between two revisions", async () => {
    const provider = new HuggingFaceProvider({ token: "hf_test", fetch: mockFetch() });
    await expect(provider.getLatestRevision({ installationId: "ada" }, repo)).resolves.toEqual({
      sha: "sha-2",
      branch: "main",
    });
    const changes = await provider.getChanges({ installationId: "ada" }, repo, "sha-1", "sha-2");
    expect(changes).toEqual([
      { path: "card.json", status: "added" },
      { path: "old.txt", status: "removed" },
      { path: "README.md", status: "modified" },
    ]);
  });

  it("reads a text file and searches paths without sending the token to the model", async () => {
    const calls: { url: string; authorization: string }[] = [];
    const provider = new HuggingFaceProvider({
      token: "hf_test",
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(input), authorization: headers.get("authorization") ?? "" });
        return mockFetch()(input, init);
      },
    });
    const file = await provider.getFile({ installationId: "ada" }, repo, "README.md", "sha-2");
    expect(file).toEqual({ path: "README.md", content: "# bert" });
    const matches = await provider.searchRepository({ installationId: "ada" }, repo, "read");
    expect(matches).toEqual([{ path: "README.md", text: "README.md" }]);
    expect(calls.every((call) => call.authorization === "Bearer hf_test")).toBe(true);
    expect(calls.some((call) => call.url.includes("README.md"))).toBe(true);
  });

  it("rejects a bad token without repeating it", async () => {
    const provider = new HuggingFaceProvider({
      token: "hf_secret",
      fetch: async () => new Response("no", { status: 401 }),
    });
    await expect(provider.whoami()).rejects.toThrow(/returned 401/);
    await expect(provider.whoami()).rejects.toThrow(/^(?!.*hf_secret)/);
  });
});

function mockFetch(): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.includes("/api/whoami-v2")) return json({ name: "ada" });
    if (url.includes("/api/models?")) return json([{ id: "ada/bert" }]);
    if (url.includes("/api/datasets?")) return json([{ id: "ada/notes" }]);
    if (url.includes("/api/spaces?")) return json([{ id: "ada/demo" }]);
    if (url.endsWith("/api/models/ada/bert")) return json({ sha: "sha-2" });
    if (url.includes("/tree/sha-1")) {
      return json([
        { type: "file", path: "README.md", oid: "aaa" },
        { type: "file", path: "old.txt", oid: "bbb" },
      ]);
    }
    if (url.includes("/tree/sha-2") || url.includes("/tree/main")) {
      return json([
        { type: "file", path: "README.md", oid: "ccc" },
        { type: "file", path: "card.json", oid: "ddd" },
        { type: "directory", path: "onnx", oid: "eee" },
      ]);
    }
    if (url.includes("/resolve/")) return new Response("# bert", { status: 200 });
    return new Response("missing", { status: 404 });
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
