// Copies the mise ingredient-drawing library's source into src/vendor/mise.
// mise is not published yet, and the app deploys by uploading this folder alone,
// so a link to ../mise would build locally and break on Vercel. Rerun after mise changes.
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, process.argv[2] ?? "../mise");
const to = join(root, "src/vendor/mise");
if (!existsSync(join(from, "src/index.ts"))) throw new Error(`No mise source at ${from}`);

rmSync(to, { recursive: true, force: true });
cpSync(join(from, "src"), to, { recursive: true, filter: (p) => !/\.test\.tsx?$/.test(p) });
const commit = execFileSync("git", ["-C", from, "rev-parse", "--short", "HEAD"]).toString().trim();
const dirty = execFileSync("git", ["-C", from, "status", "--porcelain", "src"]).toString().trim() ? " plus uncommitted changes" : "";
writeFileSync(
  join(to, "VERSION.md"),
  `# Vendored mise\n\nCopied from mise at ${commit}${dirty} by \`node scripts/sync-mise.mjs\`. Don't edit these files here: change mise and sync again.\n`,
);
console.log(`mise ${commit}${dirty} -> src/vendor/mise`);

