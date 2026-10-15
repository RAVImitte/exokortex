import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "../web/dist");
const index = join(dist, "index.html");
try {
  await access(index);
} catch {
  await mkdir(dist, { recursive: true });
  await writeFile(
    index,
    "<!doctype html><title>ExoKortex</title><p>Build the web app for the full dashboard.</p>",
  );
}
