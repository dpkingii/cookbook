import { LAU_RECIPES } from "../../src/lib/recipe/lau";
import type { Recipe, Step, Technique } from "../../src/lib/recipe/types";
import type { CorpusRecipe } from "./corpus";

export interface TruthRow {
  slug: string;
  techniques: number;
  timers: number;
  steps: number;
  missing: string[];
  extra: string[];
  stepCounts: [made: number, imported: number];
  timerPairs: [string, string];
}

function counts(xs: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

function diff(a: Map<string, number>, b: Map<string, number>): string[] {
  return [...a].flatMap(([k, n]) => Array<string>(Math.max(0, n - (b.get(k) ?? 0))).fill(k));
}

function techniqueJaccard(made: Technique[], got: Technique[]): { score: number; missing: string[]; extra: string[] } {
  const a = counts(made);
  const b = counts(got);
  const missing = diff(a, b);
  const extra = diff(b, a);
  const shared = made.length - missing.length;
  return { score: shared / (made.length + got.length - shared), missing, extra };
}

function timerScore(made: Step[], got: Step[]): number {
  const have = got.flatMap((s) => (s.timer ? [s.timer] : []));
  const want = made.flatMap((s) => (s.timer ? [s.timer] : []));
  const left = [...have];
  let hit = 0;
  for (const w of want) {
    const at = left.findIndex((g) => g.mode === w.mode && Math.abs(g.seconds - w.seconds) <= w.seconds * 0.25);
    if (at < 0) continue;
    left.splice(at, 1);
    hit += 1;
  }
  const union = want.length + have.length - hit;
  return union ? hit / union : 1;
}

const fmt = (steps: Step[]) => steps.flatMap((s) => (s.timer ? [`${s.timer.seconds}${s.timer.mode[0]}`] : [])).join(",");

export function compareToTruth(corpus: CorpusRecipe[]): { rows: TruthRow[]; overall: { techniques: number; timers: number; steps: number; combined: number } } {
  const rows: TruthRow[] = [];
  for (const made of LAU_RECIPES as Recipe[]) {
    const slug = `recipes-${made.source?.url.split("/").pop()}`;
    const got = corpus.find((c) => c.slug === slug);
    if (!got) continue;
    const t = techniqueJaccard(made.steps.map((s) => s.technique), got.draft.steps.map((s) => s.technique));
    rows.push({
      slug,
      techniques: t.score,
      timers: timerScore(made.steps, got.draft.steps),
      steps: Math.min(made.steps.length, got.draft.steps.length) / Math.max(made.steps.length, got.draft.steps.length),
      missing: t.missing,
      extra: t.extra,
      stepCounts: [made.steps.length, got.draft.steps.length],
      timerPairs: [fmt(made.steps), fmt(got.draft.steps)],
    });
  }
  const mean = (f: (r: TruthRow) => number) => rows.reduce((s, r) => s + f(r), 0) / Math.max(1, rows.length);
  const techniques = mean((r) => r.techniques);
  const timers = mean((r) => r.timers);
  const steps = mean((r) => r.steps);
  return { rows, overall: { techniques, timers, steps, combined: (techniques + timers + steps) / 3 } };
}
