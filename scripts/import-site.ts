import { config } from "dotenv";
import { parseArgs } from "node:util";
import { draftFromJsonLd, extractJsonLdRecipe, validateDraft } from "../src/lib/import";
import type { RecipeDraft } from "../src/lib/import/types";
import { isAllowed, parseRobots, PoliteFetcher, readCache, readSitemap, StopCrawl, writeCache } from "./lib/crawl";

config({ path: [".env.local", ".env"], quiet: true });

const USAGE =
  "npx tsx scripts/import-site.ts --sitemap <url> --match <text> --owner <email> [--limit N] [--dry-run] [--refresh]";

const { values } = parseArgs({
  options: {
    sitemap: { type: "string" },
    match: { type: "string" },
    owner: { type: "string" },
    limit: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
  },
});

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!values.sitemap || !values.match || !values.owner) die(`Usage: ${USAGE}`);
const limit = values.limit ? Number(values.limit) : Infinity;
if (!(limit > 0)) die("--limit must be a positive number");
const dryRun = values["dry-run"];

function localDatabaseHost(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) die("DATABASE_URL is not set (expected in .env.local).");
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    die("DATABASE_URL is not a valid URL.");
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    die(`Refusing to run: DATABASE_URL points at "${host}", not localhost or 127.0.0.1. Imports only write to a local database.`);
  }
  return host;
}

if (!dryRun) localDatabaseHost();

const pad = (s: string, n: number) => s.padEnd(n);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

async function main() {
  const fetcher = new PoliteFetcher();
  const sitemapUrl = new URL(values.sitemap!);

  let rules: RegExp[] = [];
  try {
    const robots = await fetcher.get(new URL("/robots.txt", sitemapUrl).href);
    if (robots.status === 200) rules = parseRobots(robots.body);
  } catch (e) {
    if (e instanceof StopCrawl) die(e.message);
  }

  const all = await readSitemap(sitemapUrl.href, fetcher);
  const urls = [...new Set(all.filter((u) => u.includes(values.match!)))].slice(0, limit);
  console.log(`${all.length} URLs in the sitemap, ${urls.length} match "${values.match}".`);

  const { prisma, createRecipe } = dryRun ? { prisma: null, createRecipe: null } : await openDatabase();
  const owner = prisma ? await prisma.user.findUnique({ where: { email: values.owner! }, select: { id: true } }) : null;
  if (prisma && !owner) die(`No user with email ${values.owner}.`);

  const skipped = new Map<string, number>();
  const stepsPerRecipe: number[] = [];
  const techniques = new Map<string, number>();
  const warningTexts = new Map<string, number>();
  let fetched = 0;
  let cached = 0;
  let imported = 0;
  let withWarnings = 0;
  let fallbackSteps = 0;
  let stopped: string | null = null;

  for (const [i, url] of urls.entries()) {
    let html = values.refresh ? null : await readCache(url);
    if (html !== null) cached += 1;
    else {
      if (!isAllowed(url, rules)) {
        bump(skipped, "disallowed by robots.txt");
        continue;
      }
      try {
        const res = await fetcher.get(url);
        if (res.status !== 200) {
          bump(skipped, `HTTP ${res.status}`);
          continue;
        }
        html = res.body;
        await writeCache(url, html);
        fetched += 1;
      } catch (e) {
        if (e instanceof StopCrawl) {
          stopped = e.message;
          break;
        }
        bump(skipped, "fetch failed");
        continue;
      }
    }

    const data = extractJsonLdRecipe(html);
    if (!data) {
      bump(skipped, "no Recipe data");
      continue;
    }
    const draft = draftFromJsonLd(data, url);
    const problems = validateDraft(draft);
    if (problems.length) {
      bump(skipped, `invalid draft (${problems[0].replace(/\d+/g, "N")})`);
      continue;
    }

    stepsPerRecipe.push(draft.steps.length);
    for (const s of draft.steps) bump(techniques, s.technique);
    fallbackSteps += draft.warnings.filter((w) => /has no clear technique/.test(w)).length;
    if (draft.warnings.length) withWarnings += 1;
    for (const w of draft.warnings) bump(warningTexts, w.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, "N"));

    if (prisma && createRecipe && owner) {
      await replaceRecipe(prisma, createRecipe, owner.id, draft, url);
    }
    imported += 1;
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${urls.length}`);
  }

  if (prisma) await prisma.$disconnect();

  const total = [...skipped.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${dryRun ? "DRY RUN: nothing written." : "Written to the local database."}`);
  if (stopped) console.log(`STOPPED EARLY: ${stopped}`);
  console.log(`fetched ${fetched}, from cache ${cached}, ${dryRun ? "importable" : "imported"} ${imported}, skipped ${total}`);
  for (const [reason, n] of sorted(skipped)) console.log(`  skipped ${n}: ${reason}`);

  const hist = new Map<number, number>();
  for (const n of stepsPerRecipe) hist.set(n, (hist.get(n) ?? 0) + 1);
  console.log(`\nsteps per recipe: median ${median(stepsPerRecipe)}, max ${Math.max(0, ...stepsPerRecipe)}, total ${stepsPerRecipe.reduce((a, b) => a + b, 0)}`);
  console.log([...hist.entries()].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${pad(String(n), 3)} ${"#".repeat(c)} ${c}`).join("\n"));

  console.log(`\ntechniques across all steps:\n  ${sorted(techniques).map(([t, n]) => `${t} ${n}`).join(", ")}`);
  console.log(`steps on the fallback technique (rest): ${fallbackSteps}`);
  console.log(`drafts with warnings: ${withWarnings} of ${imported}`);
  console.log("most common warnings:");
  for (const [text, n] of sorted(warningTexts).slice(0, 10)) console.log(`  ${pad(String(n), 4)} ${text}`);
}

async function openDatabase() {
  const { prisma } = await import("../src/lib/db/client");
  const { createRecipe } = await import("../src/lib/db/recipes");
  return { prisma, createRecipe };
}

type Db = Awaited<ReturnType<typeof openDatabase>>;

async function replaceRecipe(
  prisma: NonNullable<Db["prisma"]>,
  createRecipe: NonNullable<Db["createRecipe"]>,
  ownerId: string,
  draft: RecipeDraft,
  url: string,
) {
  const recipe: Omit<RecipeDraft, "warnings"> & { warnings?: string[] } = { ...draft };
  delete recipe.warnings;
  const previous = await prisma.recipe.findMany({ where: { userId: ownerId, sourceUrl: url }, select: { id: true } });
  const id = await createRecipe({ ...recipe, isPublic: false }, ownerId);
  const stale = previous.map((r) => r.id).filter((old) => old !== id);
  if (stale.length) await prisma.recipe.deleteMany({ where: { id: { in: stale }, userId: ownerId } });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
