import { TECHNIQUE_STATION } from "../../src/lib/recipe/types";
import type { Step, Technique } from "../../src/lib/recipe/types";
import { isInstruction } from "../../src/lib/import/steps";
import type { RecipeDraft } from "../../src/lib/import/types";

export interface Flag {
  rule: string;
  step: number;
  text: string;
}

const BOWL: Technique[] = ["whisk", "fold", "marinate", "knead"];
const CUTTING: Technique[] = ["chop", "mince", "slice"];
const COOKING: Technique[] = ["sear", "fry", "saute", "roast", "bake", "broil", "simmer", "boil"];

const PARALLEL_LEAD = /\b(?:while|as|meanwhile|in the meantime|once|when|before|until)\b[^,.]*(?:,|\.)\s*/gi;
const HEAT_WORDS = /\b(?:wok|pan|pot|skillet|stove|stovetop|saucepan|heat|burner|flame)\b/i;
const OFF_HEAT = /\b(?:remove|transfer|take|lift|scoop|pour)\b[^.]*\b(?:out|off|from|into a (?:bowl|plate)|onto)\b|\boff (?:the )?heat\b|\bturn(?:ed)? off\b|\bset aside\b|\bdrain|\bplate\b|\bserve\b|\bbowl\b|\bplate\b/i;
const MOVE_ONLY = /\b(?:remove|transfer|take|lift|move|scoop|set aside|rest|plate|serve|drain|let (?:it|them)? ?(?:rest|sit|cool|stand))\b/i;
const REAL_COOK = /\b(?:fry|fried|stir-fry|saut\w+|cook\w*|simmer\w*|boil\w*|bake\w*|roast\w*|sear\w*|steam\w*|heat\w*|brown\w*|grill\w*|broil\w*|poach\w*|blanch\w*|braise\w*|stew\w*|toast\w*|reduce|bring|crisp\w*|scramble|stir|toss|flip|add|swirl|cover|preheat\w*|mix\w*|combin\w*|pour in|fold)\b/i;
const STRICT_COOK = /\b(?:fry|fried|stir-fry|saut\w+|cook\w*|simmer\w*|boil\w*|bake\w*|roast\w*|sear\w*|steam\w*|heat\w*|grill\w*|broil\w*|poach\w*|blanch\w*|braise\w*)\b/i;
const CUT_VERB = /\b(?:cut|slic\w*|chop\w*|dic\w*|minc\w*|trim\w*|shred\w*|grat\w*|peel\w*|crush\w*|julienne)\b/i;
const MIX_VERB = /\b(?:mix\w*|stir\w*|massag\w*|knead\w*|toss\w*|combin\w*|whisk\w*|fold\w*|rub\w*|coat\w*)\b/i;
const REST_WORD = /\b(?:rest\w*|set aside|cool\w*|stand|sit|let)\b/i;

const NUM = String.raw`\d+(?:\.\d+)?|half an?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty`;
const DURATION = new RegExp(String.raw`\b(${NUM})(?:\s*(?:-|to)\s*(${NUM}))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b`, "gi");
const WHEN_BEFORE = /\b(?:after|in the (?:last|final)|during the (?:last|final)|every|each|remaining|halfway)\s+(?:about\s+|around\s+|roughly\s+)?$/i;

function words(n: string): number {
  const map: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, "half a": 0.5, "half an": 0.5 };
  const k = n.toLowerCase();
  return k in map ? map[k] : Number(k);
}

interface Span {
  seconds: number;
  when: boolean;
}

function durations(text: string): Span[] {
  const out: Span[] = [];
  for (const m of text.matchAll(DURATION)) {
    const unit = m[3].toLowerCase()[0] === "s" ? 1 : m[3].toLowerCase()[0] === "m" ? 60 : 3600;
    const lo = words(m[1]);
    const hi = m[2] ? words(m[2]) : lo;
    out.push({ seconds: ((lo + hi) / 2) * unit, when: WHEN_BEFORE.test(text.slice(Math.max(0, m.index - 28), m.index)) });
  }
  return out;
}

const PASSIVE_OK: Technique[] = ["marinate", "chill", "rest"];

function stepFlags(step: Step, onHeat: boolean): string[] {
  const t = step.text;
  const out: string[] = [];
  const bowl = /\bbowl\b/i.test(t);
  const parallel = t.replace(PARALLEL_LEAD, "");
  const prepObject = /\b(?:slurry|batter|marinad\w*|dressing|dough)\b/i.test(t);
  if (BOWL.includes(step.technique) && !bowl && (HEAT_WORDS.test(parallel) || (onHeat && !prepObject)) && !/\boff (?:the )?heat\b/i.test(t)) out.push("bowl-on-heat");
  if (COOKING.includes(step.technique) && MOVE_ONLY.test(t) && !REAL_COOK.test(t)) out.push("cook-on-moving");
  if (CUTTING.includes(step.technique)) {
    const cook = STRICT_COOK.exec(t);
    const cut = CUT_VERB.exec(t);
    if (cook && (!cut || cook.index < cut.index || step.timer || step.heat)) out.push("cut-on-cooking");
  }
  if (step.technique === "drain" && MIX_VERB.test(t)) out.push("drain-on-mixing");
  if (step.technique === "rest" && !step.timer && !REST_WORD.test(t)) out.push("rest-fallback");
  if (step.timer) {
    const { seconds } = step.timer;
    if (seconds < 10) out.push("timer-short");
    if (seconds > 3 * 3600 && !PASSIVE_OK.includes(step.technique)) out.push("timer-long");
    const spans = durations(t);
    const match = spans.filter((s) => Math.abs(s.seconds - seconds) <= seconds * 0.25 + 1);
    if (match.length && match.every((s) => s.when)) out.push("timer-when");
  } else if (COOKING.includes(step.technique)) {
    if (durations(t).some((s) => !s.when && s.seconds >= 10)) out.push("cook-no-timer");
  }
  if (t.length > 160) out.push("long-text");
  if (!isInstruction(t) || /^(?:this|it|these|they|there|that|note|tip)\b/i.test(t)) out.push("aside");
  return out;
}

export const RULES = [
  "bowl-on-heat", "cook-on-moving", "cut-on-cooking", "drain-on-mixing", "rest-fallback",
  "timer-short", "timer-long", "timer-when", "cook-no-timer", "long-text", "aside", "long-recipe", "never-mentioned",
] as const;

export function auditDraft(draft: RecipeDraft): Flag[] {
  const flags: Flag[] = [];
  let onHeat = false;
  draft.steps.forEach((step, i) => {
    for (const rule of stepFlags(step, onHeat)) flags.push({ rule, step: i + 1, text: step.text });
    if (COOKING.includes(step.technique) && TECHNIQUE_STATION[step.technique] !== "oven") onHeat = true;
    if (OFF_HEAT.test(step.text) || TECHNIQUE_STATION[step.technique] === "board" || step.technique === "plate") onHeat = false;
  });
  if (draft.steps.length > 14) flags.push({ rule: "long-recipe", step: 0, text: `${draft.steps.length} steps` });
  for (const w of draft.warnings) if (/isn't mentioned in any step/.test(w)) flags.push({ rule: "never-mentioned", step: 0, text: w });
  return flags;
}
