import { TECHNIQUE_STATION } from "@/lib/recipe/types";
import type { Step, StepUse, Technique } from "@/lib/recipe/types";

const MAX_CHARS = 160;
const LONG_RECIPE = 12;
const VERY_LONG_RECIPE = 14;
const PREP: Technique[] = ["chop", "mince", "slice", "drain", "season"];

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean).length;
const bare = (s: Step) => !s.uses.length && !s.timer && !s.heat && !s.cue;
const FILLER_TECHNIQUES: Technique[] = ["whisk", "rest", "plate", "season"];
const filler = (s: Step) => bare(s) && wordsOf(s.text) <= 4 && FILLER_TECHNIQUES.includes(s.technique);
const closing = (s: Step) => /^(?:enjoy|serve|eat|dig in|bon app)/i.test(s.text);

function join(a: Step, b: Step): Step {
  const seen = new Set(a.uses.map((u) => u.ingredientId));
  const uses: StepUse[] = [...a.uses, ...b.uses.filter((u) => !seen.has(u.ingredientId))];
  return { ...a, text: `${a.text} ${b.text}`, uses, ...(b.cue && !a.cue && { cue: b.cue }) };
}

/** Folds bare one-liners into the step before them and, in long recipes, merges neighbouring untimed prep steps. */
export function consolidate(steps: Step[]): Step[] {
  const out: Step[] = [];
  for (const s of steps) {
    const prev = out[out.length - 1];
    if (prev && filler(s)) {
      if (closing(s)) {
        if (prev.technique !== "plate" && s.technique === "plate") out.push(s);
        continue;
      }
      if (prev.text.length + 1 + s.text.length <= MAX_CHARS) {
        out[out.length - 1] = join(prev, s);
        continue;
      }
    }
    out.push(s);
  }
  if (out.length <= LONG_RECIPE) return out;

  const merged: Step[] = [];
  for (const s of out) {
    const prev = merged[merged.length - 1];
    const prep = prev && PREP.includes(prev.technique) && PREP.includes(s.technique) && !prev.timer && !s.timer && !prev.cue && !s.cue;
    if (prep && prev.text.length + 1 + s.text.length <= MAX_CHARS) merged[merged.length - 1] = join(prev, s);
    else merged.push(s);
  }
  if (merged.length <= VERY_LONG_RECIPE) return merged;

  const folded: Step[] = [];
  for (const s of merged) {
    const prev = folded[folded.length - 1];
    const setup = prev && !prev.timer && !prev.cue && TECHNIQUE_STATION[prev.technique] === TECHNIQUE_STATION[s.technique] && s.technique !== "plate";
    if (setup && prev.text.length + 1 + s.text.length <= MAX_CHARS) {
      folded[folded.length - 1] = { ...join(prev, s), technique: s.technique, heat: s.heat ?? prev.heat, ...(s.timer && { timer: s.timer }) };
    } else folded.push(s);
  }
  return folded;
}
