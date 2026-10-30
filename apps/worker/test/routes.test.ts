import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubProvider } from "@exokortex/github";
import { decryptString, importAesKey } from "@exokortex/security";
import { createApp } from "../src/app.js";
import { seal } from "../src/session.js";
import { handleJob } from "../src/jobs.js";
import type { Env } from "../src/env.js";
import { testDatabase } from "./database.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function fixture() {
  const data = testDatabase();
  const user = await data.db.users.upsert({
    authSubject: "dev:test@example.com",
    email: "test@example.com",
  });
  const send = vi.fn(async () => undefined);
  const env = {
    DB: data.d1,
    JOBS: { send },
    ENVIRONMENT: "development",
    AUTH_MODE: "dev",
    ENCRYPTION_KEY: btoa("x".repeat(32)),
    DEV_SESSION_SECRET: "test-session",
    GITHUB_APP_ID: "123",
    GITHUB_APP_SLUG: "test-app",
    GITHUB_APP_PRIVATE_KEY: "unused",
    GITHUB_CLIENT_ID: "client-id",
    GITHUB_CLIENT_SECRET: "client-secret",
    APP_BASE_URL: "http://localhost:5173",
  } as unknown as Env;
  const token = await seal(env.DEV_SESSION_SECRET!, {
    sub: user.authSubject,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 900,
  });
  const cookie = `exo_session=${token}`;
  const app = createApp();
  const request = (path: string, init: RequestInit = {}) =>
    app.request(
      `http://localhost:5173${path}`,
      { ...init, headers: { Cookie: cookie, ...init.headers } },
      env,
    );
  return { ...data, user, env, send, app, request };
}

describe("GitHub connection authorization", () => {
  it("requires a browser-bound state before starting user authorization", async () => {
    const { request, db, user } = await fixture();
    const install = await request("/api/github/install", {
      headers: { Accept: "application/json" },
    });
    const { url } = (await install.json()) as { url: string };
    const state = new URL(url).searchParams.get("state")!;
    expect(await db.connections.list(user.id)).toEqual([]);
    const callback = await request(
      `/api/github/callback?installation_id=99&state=${encodeURIComponent(state)}`,
    );
    expect(callback.status).toBe(401);
  });

  it.each([false, true])(
    "verifies user access before saving an installation (allowed=%s)",
    async (allowed) => {
      const { request, db, user } = await fixture();
      vi.spyOn(GitHubProvider.prototype, "discoverRepositories").mockResolvedValue([]);
      const network = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "https://github.com/login/oauth/access_token")
          return Response.json({ access_token: "user-token" });
        expect(String(input)).toBe(
          "https://api.github.com/user/installations/99/repositories?per_page=1",
        );
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer user-token");
        return Response.json({ repositories: [] }, { status: allowed ? 200 : 404 });
      });
      vi.stubGlobal("fetch", network);
      const start = await request("/api/github/install", {
        headers: { Accept: "application/json" },
      });
      const cookie = start.headers.get("set-cookie")!.split(";")[0]!;
      const { url } = (await start.json()) as { url: string };
      const state = new URL(url).searchParams.get("state")!;
      const setup = await request(
        `/api/github/callback?installation_id=99&state=${encodeURIComponent(state)}`,
        { headers: { Cookie: cookie } },
      );
      expect(setup.status).toBe(302);
      expect(network).not.toHaveBeenCalled();
      expect(await db.connections.list(user.id)).toEqual([]);
      const authorize = new URL(setup.headers.get("location")!);
      expect(authorize.origin).toBe("https://github.com");
      expect(authorize.searchParams.get("redirect_uri")).toBe(
        "http://localhost:5173/api/github/callback",
      );
      // Changing installation_id in the second callback cannot override signed state.
      const finish = await request(
        `/api/github/callback?code=one-time-code&installation_id=100&state=${encodeURIComponent(authorize.searchParams.get("state")!)}`,
        { headers: { Cookie: cookie } },
      );
      expect(finish.status).toBe(allowed ? 302 : 403);
      const connections = await db.connections.list(user.id);
      expect(connections).toHaveLength(allowed ? 1 : 0);
      if (allowed) {
        expect(connections[0]?.externalInstallationId).toBe("99");
        expect(await db.connections.ciphertext(user.id, connections[0]!.id)).not.toContain(
          "user-token",
        );
        expect(finish.headers.get("set-cookie")).toContain("Max-Age=0");
      }
    },
  );

  it("rejects session tokens and expired connection states as OAuth state", async () => {
    const { request, env, user } = await fixture();
    for (const payload of [
      { sub: user.id, exp: Math.floor(Date.now() / 1000) + 900 },
      { purpose: "github-connect", stage: "install", sub: user.id, nonce: "test", exp: 1 },
    ]) {
      const state = await seal(env.DEV_SESSION_SECRET!, payload);
      expect(
        (
          await request(`/api/github/callback?installation_id=99&state=${state}`, {
            headers: { Cookie: "exo_github_connect=test" },
          })
        ).status,
      ).toBe(401);
    }
  });
});

describe("LLM settings and multi-account scans", () => {
  it("requires the first key and preserves it when changing saved model settings", async () => {
    const { request, db, user, env } = await fixture();
    const save = (extra: object) =>
      request("/api/llm-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "test",
          baseUrl: "https://llm.example/v1",
          model: "first",
          ...extra,
        }),
      });
    expect((await save({})).status).toBe(400);
    expect((await save({ apiKey: "secret-key" })).status).toBe(200);
    const cipher = await db.llm.ciphertext(user.id);
    expect((await save({ model: "second", apiKey: "" })).status).toBe(200);
    expect(await db.llm.ciphertext(user.id)).toBe(cipher);
    expect((await db.llm.get(user.id))?.model).toBe("second");
    expect(await decryptString(await importAesKey(env.ENCRYPTION_KEY), cipher!)).toBe("secret-key");
    const response = await request("/api/llm-config");
    expect(await response.text()).not.toContain("secret-key");
  });

  it("enqueues both GitHub accounts and discovers new repositories during a scan", async () => {
    const { request, db, user, env, send } = await fixture();
    for (const installationId of ["99", "100"])
      await db.connections.upsert({
        userId: user.id,
        provider: "github",
        externalInstallationId: installationId,
        encryptedCredentials: "unused",
      });
    const discovery = vi
      .spyOn(GitHubProvider.prototype, "discoverRepositories")
      .mockImplementation(async (connection) => [
        {
          externalId: connection.installationId,
          name: `org${connection.installationId}/new`,
          url: `https://github.com/org${connection.installationId}/new`,
          defaultBranch: "main",
        },
      ]);
    vi.spyOn(GitHubProvider.prototype, "getLatestRevision").mockResolvedValue({
      sha: "baseline",
      branch: "main",
    });
    const response = await request("/api/scans", { method: "POST" });
    expect(response.status).toBe(202);
    expect(send).toHaveBeenCalledTimes(2);
    for (const [message] of send.mock.calls as unknown as [{ jobId: string }][])
      await handleJob(env, message.jobId);
    expect(discovery).toHaveBeenCalledTimes(2);
    const repos = await db.repos.list(user.id);
    expect(repos).toHaveLength(2);
    expect(repos.every((repo) => repo.lastRevision === "baseline")).toBe(true);
    expect(await db.changes.list(user.id)).toEqual([]);
  });
});
