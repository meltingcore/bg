import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = join(appRoot, "dist");
const publicEntries = ["index.html", "styles.css", "assets", "src"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
  await cp(join(appRoot, entry), join(outputDirectory, entry), { recursive: true });
}
