import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptString, importAesKey } from "@exokortex/security";
import { enqueueCurate, enqueueScan, handleJob } from "../src/jobs.js";
import { portfolioInstallation } from "../src/engineer.js";
import type { Env } from "../src/env.js";
import { seed, testDatabase } from "./database.js";

afterEach(() => vi.unstubAllGlobals());

describe("database and job recovery", () => {
  it("recovers unsent jobs with their workflow and atomically deduplicates enqueue", async () => {
    const { db, d1, sqlite } = testDatabase();
    const { user } = await seed(db);
    const env = {
      DB: d1,
      JOBS: {
        send: async () => {
          throw new Error("queue unavailable");
        },
      },
    } as unknown as Env;
    const input = { userId: user.id, installationId: "99", idempotencyKey: "one" };
    await expect(enqueueScan(env, db, input)).rejects.toThrow("queue unavailable");
    const due = await db.jobs.listDue(new Date().toISOString());
    expect(due).toHaveLength(1);
    expect(due[0]?.workflowId).toBeTruthy();
    await enqueueScan(env, db, input);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM workflows").get()?.n).toBe(1);
    const claimed = await db.jobs.claim(due[0]!.id, new Date().toISOString());
    expect(claimed).toBeTruthy();
    expect(await db.jobs.claim(due[0]!.id, new Date().toISOString())).toBeNull();
  });

  it("rolls back workflow creation when inserting its job fails", async () => {
    const { db, sqlite, failures } = testDatabase();
    const { user } = await seed(db);
    failures.next = "INSERT INTO jobs";
    await expect(
      db.jobs.insert({
        userId: user.id,
        type: "scan",
        payload: {},
        idempotencyKey: "one",
        maxAttempts: 3,
        workflowState: "SCAN_PENDING",
      }),
    ).rejects.toThrow();
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM workflows").get()?.n).toBe(0);
  });

  it("scopes open and curator-ready changes by connection before processing", async () => {
    const { db } = testDatabase();
    const { user, repo, connection } = await seed(db);
    const other = await db.connections.upsert({
      userId: user.id,
      provider: "huggingface",
      externalInstallationId: "ada",
      encryptedCredentials: "unused",
    });
    const { record } = await db.repos.upsert({
      userId: user.id,
      connectionId: other.id,
      externalId: "models/ada/api",
      name: "acme/api",
      url: "https://huggingface.co/ada/api",
      defaultBranch: "main",
    });
    for (const item of [repo, record])
      await db.changes.insert({
        userId: user.id,
        repositoryId: item.id,
        fromRevision: "a",
        toRevision: "b",
      });
    expect(
      (await db.changes.listOpen(user.id, undefined, connection.id)).map((c) => c.repositoryId),
    ).toEqual([repo.id]);
    for (const change of await db.changes.listOpen(user.id))
      await db.changes.mark(user.id, change.id, {
        summary: "test",
        significance: "high",
        status: "analyzed",
      });
    expect(
      (await db.changes.listReadyForCurator(user.id, undefined, other.id)).map(
        (c) => c.repositoryId,
      ),
    ).toEqual([record.id]);
    await db.repos.setRole(user.id, record.id, "EXCLUDED");
    expect(await db.changes.listReadyForCurator(user.id, undefined, other.id)).toEqual([]);
  });

  it("uses the portfolio's installation instead of the first connected account", async () => {
    const { db } = testDatabase();
    const { user, connection } = await seed(db);
    const second = await db.connections.upsert({
      userId: user.id,
      provider: "github",
      externalInstallationId: "100",
      encryptedCredentials: "unused",
    });
    const { record } = await db.repos.upsert({
      userId: user.id,
      connectionId: second.id,
      externalId: "8",
      name: "org/site",
      url: "https://github.com/org/site",
      defaultBranch: "v2",
    });
    await db.repos.setRole(user.id, record.id, "PORTFOLIO");
    expect(await portfolioInstallation(db, user.id)).toBe("100");
    await db.connections.disconnect(user.id, second.id);
    await expect(portfolioInstallation(db, user.id)).rejects.toThrow("Reconnect");
    expect((await db.connections.findOwned(user.id, connection.id))?.status).toBe("active");
  });

  it("enforces the project cap without rejecting an existing project", async () => {
    const { db, sqlite } = testDatabase();
    const { user } = await seed(db);
    const project = {
      userId: user.id,
      slug: "project",
      name: "Project",
      description: "test",
      technologies: [],
    };
    const existing = await db.projects.create(project);
    sqlite
      .prepare(
        `INSERT INTO portfolio_projects (id,user_id,slug,name,created_at,updated_at)
      SELECT 'p' || value, ?, 'p' || value, 'Project', '', '' FROM json_each(?)`,
      )
      .run(user.id, JSON.stringify(Array.from({ length: 199 }, (_, i) => i)));
    expect((await db.projects.create(project)).id).toBe(existing.id);
    await expect(db.projects.create({ ...project, slug: "overflow" })).rejects.toThrow(
      "limit of 200",
    );
  });

  it("resumes saved Curator output after an approval insert fails without another model call", async () => {
    const { db, d1, failures } = testDatabase();
    const { user, repo } = await seed(db);
    await db.changes.insert({
      userId: user.id,
      repositoryId: repo.id,
      fromRevision: "a",
      toRevision: "b",
    });
    const [change] = await db.changes.listOpen(user.id);
    await db.changes.mark(user.id, change!.id, {
      summary: "API",
      significance: "high",
      status: "analyzed",
    });
    await db.agents.complete({
      userId: user.id,
      changeEventId: change!.id,
      agentName: "analyst",
      outputJson: JSON.stringify({
        purpose: "API",
        architecture: "One service",
        technologies: [],
        relationships: [],
        evidence: [],
      }),
    });
    const key = btoa("x".repeat(32));
    await db.llm.save({
      userId: user.id,
      provider: "test",
      baseUrl: "https://llm.example/v1",
      model: "test",
      encryptedApiKey: await encryptString(await importAesKey(key), "test-key"),
      keyVersion: 1,
    });
    const generate = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    classification: "NEW_PROJECT",
                    projectSlug: "api",
                    reason: "New API",
                    followupQuestion: null,
                  }),
                },
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", generate);
    const env = {
      DB: d1,
      ENCRYPTION_KEY: key,
      JOBS: { send: async () => undefined },
    } as unknown as Env;
    const makeJob = (id: string) =>
      db.jobs.insert({
        userId: user.id,
        type: "curate",
        payload: { changeEventId: change!.id },
        idempotencyKey: id,
        maxAttempts: 3,
        workflowState: "CURATING",
      });
    failures.next = "INSERT INTO approvals";
    await handleJob(env, (await makeJob("first")).job.id);
    expect(await db.changes.listReadyForCurator(user.id)).toHaveLength(1);
    await handleJob(env, (await makeJob("retry")).job.id);
    expect(await db.approvals.list(user.id)).toHaveLength(1);
    expect(await db.changes.listReadyForCurator(user.id)).toEqual([]);
    expect(generate).toHaveBeenCalledTimes(1);
    const manual = await enqueueCurate(env, db, {
      userId: user.id,
      changeId: change!.id,
      idempotencyKey: "manual",
    });
    await handleJob(env, manual.jobId);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await db.approvals.list(user.id)).toHaveLength(1);
  });
});
