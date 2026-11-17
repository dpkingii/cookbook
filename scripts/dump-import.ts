import { loadCorpus } from "./lib/corpus";

async function main() {
  const [filter = "", technique] = process.argv.slice(2);
  const corpus = await loadCorpus("madewithlau.com", filter);
  for (const { slug, draft } of corpus) {
    const steps = draft.steps.map((s, i) => ({ s, i })).filter(({ s }) => !technique || s.technique === technique);
    if (steps.length === 0) continue;
    console.log(`\n## ${slug.replace(/^recipes-/, "")} (${draft.steps.length} steps)`);
    for (const { s, i } of steps) {
      const timer = s.timer ? ` [${s.timer.seconds}s ${s.timer.mode}]` : "";
      console.log(`${String(i + 1).padStart(2)} ${s.technique.padEnd(8)} ${s.heat ?? "-"}${timer} | ${s.text}`);
    }
  }
}

main();
