import type { StepTimer, Technique } from "@/lib/recipe/types";

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, "half an": 0.5, "half a": 0.5, "a couple of": 2,
};

const NUM_SRC = String.raw`\d+(?:\.\d+)?(?:\s+\d+/\d+)?|\d+/\d+|half an?|a couple of|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty`;
const UNIT_SRC = String.raw`seconds?|secs?|minutes?|mins?|hours?|hrs?`;

const CROSS = new RegExp(String.raw`\b(${NUM_SRC})\s*(${UNIT_SRC})\s*(?:to|[-–—])\s*(${NUM_SRC})\s*(${UNIT_SRC})\b`, "gi");
const SIMPLE = new RegExp(
  String.raw`\b(${NUM_SRC})(?:\s*(?:[-–—]|\bto\b)\s*(${NUM_SRC}))?(-)?\s*(?:(?:more|additional|extra|further|full)\s+)?(${UNIT_SRC})\b(\s+and\s+a\s+half\b)?`,
  "gi",
);

const LIMIT_BEFORE = /(?:every|each|more than|over|up to|within|at most|no longer than|less than|under|no more than)\s+(?:about\s+)?$/i;
const FOR_BEFORE = /\bfor\s+(?:about\s+|around\s+|roughly\s+|approximately\s+|another\s+|an additional\s+)?$/i;

function numberOf(src: string): number {
  const s = src.trim().toLowerCase();
  if (s in WORD_NUMBERS) return WORD_NUMBERS[s];
  return s.split(/\s+/).reduce((sum, p) => {
    const f = p.match(/^(\d+)\/(\d+)$/);
    return sum + (f ? Number(f[1]) / Number(f[2]) : Number(p));
  }, 0);
}

function unitSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("s")) return 1;
  if (u.startsWith("m")) return 60;
  return 3600;
}

const AFTER_BEFORE = /\b(?:after\s+(?:[a-z-]+ing\s+(?:[a-z-]+\s+){0,2})?(?:for\s+)?(?:about\s+|around\s+|roughly\s+|~\s*)?|in the (?:last|final)\s+(?:about\s+)?|during the (?:last|final)\s+(?:about\s+)?)$/i;
const A_SECOND_OK = /\b(?:for|about|within|in|just|only|another)\s+$/i;

interface Candidate {
  seconds: number;
  index: number;
  forPhrase: boolean;
  after: boolean;
}

function candidates(text: string): Candidate[] {
  const found: Candidate[] = [];
  const taken: [number, number][] = [];
  const overlaps = (i: number, end: number) => taken.some(([a, b]) => i < b && end > a);
  const ok = (index: number) => !LIMIT_BEFORE.test(text.slice(Math.max(0, index - 30), index));
  const push = (seconds: number, index: number, end: number) => {
    taken.push([index, end]);
    if (!ok(index)) return;
    const before = text.slice(Math.max(0, index - 30), index);
    const after = AFTER_BEFORE.test(before);
    found.push({ seconds, index, forPhrase: FOR_BEFORE.test(before), after });
  };

  for (const m of text.matchAll(CROSS)) {
    const a = numberOf(m[1]) * unitSeconds(m[2]);
    const b = numberOf(m[3]) * unitSeconds(m[4]);
    push((a + b) / 2, m.index, m.index + m[0].length);
  }
  for (const m of text.matchAll(SIMPLE)) {
    if (overlaps(m.index, m.index + m[0].length) || m[3]) continue;
    const singleSecond = !m[2] && /^(?:an?|one)$/i.test(m[1]) && /^sec/i.test(m[4]);
    if (singleSecond && (!A_SECOND_OK.test(text.slice(Math.max(0, m.index - 12), m.index)) || /^\s+(?:time|ladle|bag|batch|round|pass|layer|coat)/i.test(text.slice(m.index + m[0].length)))) continue;
    const lo = numberOf(m[1]);
    const hi = m[2] ? numberOf(m[2]) : lo;
    push(((lo + hi) / 2 + (m[5] ? 0.5 : 0)) * unitSeconds(m[4]), m.index, m.index + m[0].length);
  }
  const overnight = /\bovernight\b/i.exec(text);
  if (overnight) push(8 * 3600, overnight.index, overnight.index + overnight[0].length);
  return found.sort((a, b) => a.index - b.index);
}

export const PASSIVE: Technique[] = ["boil", "simmer", "roast", "bake", "marinate", "rest", "chill", "drain"];

const BASE_LABEL: Partial<Record<Technique, string>> = {
  simmer: "Simmer", boil: "Boil", roast: "Roast", bake: "Bake", marinate: "Marinate", rest: "Rest",
  chill: "Chill", fry: "Stir-fry", sear: "Sear", saute: "Sauté", whisk: "Mix", fold: "Fold",
  knead: "Knead", drain: "Soak", broil: "Broil",
};

const GERUND: Partial<Record<Technique, string>> = {
  simmer: "simmering", boil: "boiling", roast: "roasting", bake: "baking", marinate: "marinating",
  rest: "resting", chill: "chilling", fry: "frying", sear: "searing", saute: "cooking", whisk: "mixing",
  fold: "folding", knead: "kneading", drain: "soaking", broil: "broiling",
};

const NOT_FOOD = new Set([
  "pot", "pan", "wok", "oven", "heat", "lid", "bowl", "water", "mixture", "tray", "rack", "bag", "skillet",
  "sheet", "minutes", "remaining", "first", "next", "last", "other", "same", "skin", "side", "sides", "bottom",
  "surface", "stove", "fridge", "rest", "time", "cooking", "dish", "plate", "top", "oil", "microwave", "way",
]);
const STOP = new Set([
  "for", "in", "on", "over", "with", "and", "to", "until", "at", "into", "from", "about", "before", "then",
  "of", "is", "are", "be", "a", "the", "while", "per", "by", "so", "or", "when", "once", "after", "has", "have", "had", "finished", "done", "ready", "onto", "around", "across", "through", "along", "under", "than", "as",
]);
const TRAILING_VERBS = new Set([
  "cool", "rest", "sit", "simmer", "boil", "cook", "bake", "roast", "marinate", "come", "reach", "stand",
  "chill", "steam", "fry", "soak", "thicken", "overnight", "well", "again", "completely",
]);

function objectNoun(text: string): string | null {
  for (const m of text.matchAll(/(?<!\b(?:with|in|into|on|onto|to|from|of|over|under|by|for|at|and|or|until|than) )\b(?:the|your)\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/gi)) {
    const words: string[] = [];
    for (const w of m[1].toLowerCase().split(/\s+/)) {
      if (STOP.has(w)) break;
      words.push(w);
    }
    while (words.length && (TRAILING_VERBS.has(words[words.length - 1]) || /ly$/.test(words[words.length - 1]))) words.pop();
    while (words.length > 3) words.pop();
    if (!words.length || NOT_FOOD.has(words[0])) continue;
    return words.join(" ");
  }
  return null;
}

function labelFor(text: string, technique: Technique): string {
  const base = BASE_LABEL[technique] ?? "Wait";
  const noun = objectNoun(text);
  const gerund = GERUND[technique];
  if (noun && gerund) {
    const nounWords = noun.split(" ");
    while (nounWords.length) {
      const phrase = nounWords.join(" ");
      const label = `${phrase[0].toUpperCase()}${phrase.slice(1)} ${gerund}`;
      const echoes = gerund.startsWith(nounWords[nounWords.length - 1].slice(0, 4));
      if (!echoes && label.length <= 24) return label;
      nounWords.shift();
    }
  }
  return base;
}

const MIN_SECONDS = 10;

function timerFrom(pick: Candidate | undefined, text: string, technique: Technique): StepTimer | undefined {
  if (!pick) return undefined;
  const seconds = Math.round(pick.seconds);
  if (seconds < MIN_SECONDS) return undefined;
  return {
    seconds,
    mode: PASSIVE.includes(technique) || seconds >= 300 ? "background" : "stay",
    label: labelFor(text, technique),
  };
}

/** How long to wait on this step. A duration that only says when to act ("after 2 minutes, flip") belongs to the step before. */
export function detectTimer(text: string, technique: Technique): StepTimer | undefined {
  const list = candidates(text);
  return timerFrom(list.find((c) => c.forPhrase) ?? list.find((c) => !c.after), text, technique);
}

export function detectDelayedTimer(text: string, technique: Technique): StepTimer | undefined {
  return timerFrom(candidates(text).find((c) => c.after), text, technique);
}

export function parseDuration(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const m = iso.trim().match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m || (!m[1] && !m[2] && !m[3] && !m[4])) return null;
  const [d, h, min, s] = [m[1], m[2], m[3], m[4]].map((v) => (v ? Number(v) : 0));
  return Math.round(d * 1440 + h * 60 + min + s / 60);
}

export function durationMinutes(text: string): number | null {
  const first = candidates(text)[0];
  return first ? Math.round(first.seconds / 60) : null;
}
