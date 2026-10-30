import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Database } from "@exokortex/database";

// Real SQLite SQL, constraints and rollback; only the D1 transport is adapted.
export function testDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const directory = new URL("../../../packages/database/migrations/", import.meta.url);
  for (const migration of readdirSync(directory).sort()) {
    if (migration.endsWith(".sql"))
      sqlite.exec(readFileSync(new URL(migration, directory), "utf8"));
  }
  const failures = { next: "" };
  function prepare(sql: string, params: unknown[] = []) {
    function check() {
      if (failures.next && sql.includes(failures.next)) {
        failures.next = "";
        throw new Error("simulated D1 failure");
      }
    }
    return {
      bind: (...values: unknown[]) => prepare(sql, values),
      async first(column?: string) {
        check();
        const row = sqlite.prepare(sql).get(...(params as [])) ?? null;
        return column && row ? row[column] : row;
      },
      async all() {
        check();
        return { results: sqlite.prepare(sql).all(...(params as [])), success: true, meta: {} };
      },
      async run() {
        check();
        const result = sqlite.prepare(sql).run(...(params as []));
        return { results: [], success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }
  const d1 = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { sqlite, d1, db: new Database(d1), failures };
}

export async function seed(db: Database, subject = "dev:test@example.com") {
  const user = await db.users.upsert({ authSubject: subject, email: "test@example.com" });
  const connection = await db.connections.upsert({
    userId: user.id,
    provider: "github",
    externalInstallationId: "99",
    encryptedCredentials: "unused",
  });
  const { record: repo } = await db.repos.upsert({
    userId: user.id,
    connectionId: connection.id,
    externalId: "7",
    name: "acme/api",
    url: "https://github.com/acme/api",
    defaultBranch: "main",
  });
  return { user, connection, repo };
}
