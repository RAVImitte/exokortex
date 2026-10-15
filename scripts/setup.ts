import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const target = "apps/worker/.dev.vars";

if (existsSync(target)) {
  console.log(`${target} already exists. Leaving it alone.`);
} else {
  const key = randomBytes(32).toString("base64");
  const example = readFileSync("apps/worker/.dev.vars.example", "utf8");
  const contents = example
    .replace("ENCRYPTION_KEY=", `ENCRYPTION_KEY=${key}`)
    .replace("APP_BASE_URL=http://127.0.0.1:8787", "APP_BASE_URL=http://127.0.0.1:5173");
  writeFileSync(target, contents);
  console.log(`Wrote ${target} with a new encryption key.`);
}

console.log("Next:");
console.log("  pnpm db:migrate:local");
console.log("  pnpm dev");
console.log("Open http://127.0.0.1:5173 and sign in with any email.");
