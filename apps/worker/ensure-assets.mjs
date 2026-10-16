import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "../web/dist");
const index = join(dist, "index.html");

await mkdir(dist, { recursive: true });
await rm(join(dist, "assets"), { recursive: true, force: true });
await writeFile(
  index,
  '<!doctype html><title>ExoKortex</title><p>This port is the API. Open the dashboard at <a href="http://localhost:5173">http://localhost:5173</a>.</p>',
);
