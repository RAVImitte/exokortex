import { describe, expect, it } from "vitest";
import { KaggleProvider } from "./provider.js";

const dataset = {
  externalId: "datasets/ada/birds",
  name: "datasets/ada/birds",
  defaultBranch: "main",
};

describe("KaggleProvider", () => {
  it("discovers the account's datasets and notebooks and skips other owners", async () => {
    const provider = new KaggleProvider({ token: "KGAT_test", fetch: mockFetch() });
    await expect(provider.whoami()).resolves.toEqual({ username: "ada" });
    await expect(provider.discoverRepositories({ installationId: "ada" })).resolves.toEqual([
      {
        externalId: "datasets/ada/birds",
        name: "datasets/ada/birds",
        url: "https://www.kaggle.com/datasets/ada/birds",
        defaultBranch: "main",
      },
      {
        externalId: "kernels/ada/train",
        name: "kernels/ada/train",
        url: "https://www.kaggle.com/code/ada/train",
        defaultBranch: "main",
      },
    ]);
  });

  it("reads a dataset version and diffs file sizes between versions", async () => {
    const provider = new KaggleProvider({ token: "KGAT_test", fetch: mockFetch() });
    await expect(provider.getLatestRevision({ installationId: "ada" }, dataset)).resolves.toEqual({
      sha: "v3",
      branch: "main",
    });
    const changes = await provider.getChanges({ installationId: "ada" }, dataset, "v2", "v3");
    expect(changes).toEqual([
      { path: "data.csv", status: "modified" },
      { path: "notes.md", status: "added" },
      { path: "old.csv", status: "removed" },
    ]);
  });

  it("reads notebook source with the bearer token and does not repeat the token", async () => {
    const calls: { url: string; authorization: string }[] = [];
    const provider = new KaggleProvider({
      token: "KGAT_secret",
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(input), authorization: headers.get("authorization") ?? "" });
        return mockFetch()(input, init);
      },
    });
    const notebook = {
      externalId: "kernels/ada/train",
      name: "kernels/ada/train",
      defaultBranch: "main",
    };
    const file = await provider.getFile({ installationId: "ada" }, notebook, "train.ipynb");
    expect(file).toEqual({ path: "train.ipynb", content: "print(1)" });
    const matches = await provider.searchRepository({ installationId: "ada" }, dataset, "notes");
    expect(matches).toEqual([{ path: "notes.md", text: "notes.md" }]);
    expect(calls.some((call) => call.url.includes("/kernels/pull"))).toBe(true);
    expect(
      calls
        .filter((call) => call.url.includes("/kernels/pull"))
        .every((call) => call.authorization === "Bearer KGAT_secret"),
    ).toBe(true);
    await expect(
      new KaggleProvider({
        token: "KGAT_secret",
        fetch: async () => json({ active: false }),
      }).whoami(),
    ).rejects.toThrow(/returned 401/);
  });
});

function mockFetch(): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/introspect")) return json({ active: true, username: "ada" });
    if (url.includes("/api/v1/datasets/list?")) {
      return json([
        { ref: "ada/birds", ownerRef: "ada", url: "https://www.kaggle.com/datasets/ada/birds" },
        { ref: "kaggle/titanic", ownerRef: "kaggle" },
      ]);
    }
    if (url.includes("/api/v1/kernels/list?")) {
      return json([{ ref: "ada/train", author: "ada", currentVersionNumber: 4 }]);
    }
    if (url.includes("/datasets/view/")) return json({ currentVersionNumber: 3 });
    if (url.includes("datasetVersionNumber=2")) {
      return json({
        datasetFiles: [
          { name: "data.csv", totalBytes: 10 },
          { name: "old.csv", totalBytes: 3 },
        ],
      });
    }
    if (url.includes("/datasets/list/ada/birds")) {
      return json({
        datasetFiles: [
          { name: "data.csv", totalBytes: 11 },
          { name: "notes.md", totalBytes: 4 },
        ],
      });
    }
    if (url.includes("/kernels/pull")) {
      return json({
        metadata: { currentVersionNumber: 4 },
        blob: { source: "print(1)", kernelType: "notebook", language: "python", slug: "train" },
      });
    }
    if (url.includes("/datasets/download/")) return new Response("id,name", { status: 200 });
    return new Response("missing", { status: 404 });
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
