import { parseArgs } from "node:util";
import type { RecipeDraft } from "../src/lib/import/types";
import { loadCorpus } from "./lib/corpus";

const USAGE = "npx tsx scripts/inspect-corpus.ts <host> [--only <slug text>] [--audit]";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { only: { type: "string" }, audit: { type: "boolean", default: false } },
});
const host = positionals[0];
if (!host) {
  console.error(`Usage: ${USAGE}`);
  process.exit(1);
}

function show({ slug, draft }: { slug: string; draft: RecipeDraft }) {
  console.log(`\n=== ${slug}: ${draft.title} (${draft.steps.length} steps)`);
  for (const i of draft.ingredients) {
    console.log(`  - ${i.id} | ${i.quantity ?? ""} ${i.unit ?? ""} ${i.name}${i.note ? ` [${i.note}]` : ""} {${i.token.shape}${i.token.color === "#c9bfae" ? " DEFAULT" : ""}}`);
  }
  draft.steps.forEach((s, n) => {
    const timer = s.timer ? ` timer=${s.timer.seconds}s/${s.timer.mode}/${s.timer.label}` : "";
    console.log(`${n + 1}. [${s.technique}${s.heat ? `/${s.heat}` : ""}${timer}${s.cue ? ` cue="${s.cue}"` : ""}] ${s.text}`);
    console.log(`     uses: ${s.uses.map((u) => u.ingredientId + (u.portion === 0 ? "(0)" : "")).join(", ")}`);
  });
  for (const w of draft.warnings) console.log(`  ! ${w}`);
}

function audit(recipes: { slug: string; draft: RecipeDraft }[]) {
  const defaults = new Map<string, number>();
  const rows: string[] = [];
  for (const { slug, draft } of recipes) {
    for (const i of draft.ingredients) if (i.token.color === "#c9bfae") defaults.set(i.name.toLowerCase(), (defaults.get(i.name.toLowerCase()) ?? 0) + 1);
    draft.steps.forEach((s, n) => {
      const tag = `${slug}#${n + 1}`;
      if (s.text.length > 160) rows.push(`long(${s.text.length}) ${tag}`);
      if (s.timer && (s.timer.seconds > 3 * 3600 || s.timer.seconds < 5)) rows.push(`odd timer ${s.timer.seconds}s ${tag}: ${s.text}`);
    });
  }
  console.log("neutral-token ingredient names:");
  for (const [name, n] of [...defaults].sort((a, b) => b[1] - a[1])) console.log(`  ${n} ${name}`);
  console.log("\nflagged steps:");
  for (const r of rows) console.log(`  ${r}`);
}

loadCorpus(host, values.only).then((recipes) => {
  if (values.audit) audit(recipes);
  else recipes.forEach(show);
});
