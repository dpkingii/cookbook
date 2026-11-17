import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { RULES, auditDraft, type Flag } from "./lib/audit-rules";
import { loadCorpus } from "./lib/corpus";
import { compareToTruth } from "./lib/ground-truth";

const USAGE = "npx tsx scripts/audit-import.ts [host] [--show <rule>] [--truth] [--save <file>]";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { show: { type: "string" }, truth: { type: "boolean", default: false }, save: { type: "string" }, only: { type: "string" } },
});
if (values.show && !(RULES as readonly string[]).includes(values.show)) {
  console.error(`Unknown rule. ${USAGE}\nRules: ${RULES.join(", ")}`);
  process.exit(1);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function main() {
  const corpus = await loadCorpus(positionals[0] ?? "madewithlau.com", values.only);
  const byRule = new Map<string, { slug: string; flag: Flag }[]>(RULES.map((r) => [r, []]));
  for (const { slug, draft } of corpus) for (const flag of auditDraft(draft)) byRule.get(flag.rule)!.push({ slug, flag });

  console.log(`${corpus.length} recipes, ${corpus.reduce((n, c) => n + c.draft.steps.length, 0)} steps`);
  console.log("\nrule              steps  recipes  examples");
  for (const rule of RULES) {
    const hits = byRule.get(rule)!;
    const slugs = [...new Set(hits.map((h) => h.slug.replace(/^recipes-/, "")))];
    console.log(`${rule.padEnd(16)} ${String(hits.length).padStart(6)} ${String(slugs.length).padStart(8)}  ${slugs.slice(0, 3).join(", ")}`);
  }
  const counts = corpus.map((c) => c.draft.steps.length);
  console.log(`\nsteps per recipe: median ${median(counts)}, max ${Math.max(...counts)}`);
  console.log(`drafts with warnings: ${corpus.filter((c) => c.draft.warnings.length).length}`);

  const truth = compareToTruth(corpus);
  console.log(`\nground truth (8 hand-made recipes): techniques ${pct(truth.overall.techniques)}, timers ${pct(truth.overall.timers)}, step count ${pct(truth.overall.steps)}, overall ${pct(truth.overall.combined)}`);
  if (values.truth) {
    for (const r of truth.rows) {
      console.log(`\n${r.slug}: techniques ${pct(r.techniques)}, timers ${pct(r.timers)}, steps ${r.stepCounts.join(" vs ")}`);
      console.log(`  missing: ${r.missing.join(", ") || "-"} | extra: ${r.extra.join(", ") || "-"}`);
      console.log(`  timers made: ${r.timerPairs[0] || "-"} | imported: ${r.timerPairs[1] || "-"}`);
    }
  }

  if (values.show) {
    console.log(`\n${values.show}:`);
    for (const { slug, flag } of byRule.get(values.show)!) console.log(`  ${slug.replace(/^recipes-/, "")}#${flag.step}: ${flag.text}`);
  }
  if (values.save) {
    const flags = Object.fromEntries(RULES.map((r) => [r, byRule.get(r)!.map((h) => `${h.slug}#${h.flag.step}`)]));
    await writeFile(values.save, JSON.stringify({ flags, truth: truth.overall }, null, 1));
  }
}

main();
