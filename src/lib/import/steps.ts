import { TECHNIQUE_STATION } from "@/lib/recipe/types";
import type { Ingredient, Step, Technique } from "@/lib/recipe/types";
import { analyzeTechnique, detectHeat, type TechniqueMatch } from "./technique";
import { detectTimer } from "./timer";
import { linkIngredients } from "./uses";

export interface StepContext {
  used: Set<string>;
  warnings: string[];
  /** Steps produced so far. */
  count: number;
  /** Technique of the latest step cooked on a pan, pot or oven. */
  last?: Technique;
}

export function createStepContext(): StepContext {
  return { used: new Set(), warnings: [], count: 0 };
}

const MAX_CHARS = 160;
const MAX_SHOWN = 2;

const ABBREVIATIONS = new Set(["oz", "lb", "lbs", "tsp", "tbsp", "min", "mins", "approx", "approximately", "e.g", "i.e", "vs", "etc", "no", "pkg", "sec", "hr", "hrs"]);

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+(?=\s+(?:["“'(]?[A-Z0-9(]))/g;
  for (const m of text.matchAll(re)) {
    const end = m.index + m[0].length;
    const before = text.slice(start, m.index).match(/([A-Za-z.]+)$/)?.[1]?.toLowerCase();
    const next = text.slice(end).trimStart()[0];
    if (m[0] === "." && before && ABBREVIATIONS.has(before) && /[a-z0-9]/.test(next)) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

const CUE_RE = /\buntil\s+([^,.;!]+)/i;
const CUE_TAIL = /\s+(?:and|then)\s+(?:then\s+)?(?:set|serve|let|remove|transfer|cover|add|turn|flip|stir|mix|continue|bring|reduce|enjoy|plate|use|pour|take|keep)\b.*$|\s+(?:before|so that)\b.*$/i;

export function detectCue(text: string): string | undefined {
  const m = CUE_RE.exec(text);
  if (!m) return undefined;
  let cue = m[1].replace(/\s*\([^)]*\)/g, "").replace(CUE_TAIL, "").trim();
  if (cue.length > 60) cue = cue.slice(0, cue.lastIndexOf(" ", 60)).trim();
  if (!cue) return undefined;
  return cue[0].toUpperCase() + cue.slice(1);
}

const VERBS = new Set(
  `add adjust allow bake baste beat blanch blend boil break bring broil brown brush carve check chill chop coat combine continue cook cool cover crack cream crumble crush cut deglaze dice dip discard divide drain dress drizzle drop dry dust enjoy fill finish flake flip fluff fold fry garnish get give grate grease grill halve heat hold increase juice keep knead ladle layer leave let lift lower make marinate mash measure melt microwave mince mix mound open pack pan-fry pat peel pierce pinch place plate poach pop pound pour preheat prepare press prick pry pull push put quarter raise reduce refrigerate reheat remove repeat reserve rest return rinse roast roll rotate rub saute scatter scoop score scrape sear season serve set shake shape shred sift simmer skim slice slide smash soak spoon spread sprinkle squeeze stack start steam steep stew stir stir-fry strain stuff swirl switch take taste tear thaw thin tie tilt toast top toss transfer trim turn twist uncover unwrap use wait warm wash whisk wipe wrap zest scoot massage dissolve soften submerge arrange lay line whip dab separate loosen poke crisp rehydrate flatten`.split(/\s+/),
);

const ADVERB = /^(?:\w+ly|just|also|always|never|well|then|now|next|first|finally|lastly|meanwhile|afterwards?|anyway|so|and|please|slowly|quickly)$/;
const LEAD_CLAUSE = /^(?:now that|once|after|when|whenever|as|while|if|before|since|using|with|to|for|in (?:a|the|your)|on (?:a|the|your)|at this point)\b[^,]*,\s*/i;
const SUBJECT = /^(?:(?:we|you)(?:'ll| will| can| should| need to| want to| may)?|let's|let us|it'?s time to)\s+/i;

function firstWord(sentence: string): string {
  let s = sentence.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(LEAD_CLAUSE, "").replace(SUBJECT, "").replace(/^be\s+/i, "").replace(/^\(/, "");
    const w = s.match(/^([a-z][a-z'-]*)\s*/i);
    if (w && ADVERB.test(w[1].toLowerCase()) && s.length > w[0].length) s = s.slice(w[0].length).replace(/^[,\s]+/, "");
    if (s === before) break;
  }
  return (s.match(/^[a-z][a-z'-]*/i)?.[0] ?? "").toLowerCase();
}

export function isInstruction(sentence: string): boolean {
  if (/[?:]$/.test(sentence) || /^\(/.test(sentence)) return false;
  if (/^keep in mind\b/i.test(sentence)) return false;
  return VERBS.has(firstWord(sentence));
}

const TIP = /^(?:chef'?s\s+|pro\s+|quick\s+|helpful\s+)?(?:tip|note|hint|variation|reminder|why)\b/i;
const OPTIONAL = /^(?:if (?:you|your|you're|you've|we|i)\b|(?:you (?:can|may|could) )?also\b|you (?:can|may|could)\b)/i;
const HEAT_LABEL = /^(?:heat off|(?:high|medium[- ]high|medium[- ]low|medium|low)(?: heat)?)\s*[—–]\s*/i;
const TIME_MARKER = /\s*[—–]\s*~?\d[^.!?]*?(?:seconds?|secs?|minutes?|mins?|hours?)\s*$/i;
const LEAD_WORDS = /^(?:(?:then|next|now|and|first|finally|afterwards?|anyway|lastly)\b,?\s+)+/i;
const PURPOSE = /,?\s+(?:to (?:ensures?|help|prevent|avoid)|so that|so (?:you|they|it)(?:'re|'ll|'s| can| will| don't| won't| are| is)|in order to|which (?:helps|allows|means|will|makes|ensures)|because)\b/i;

function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function tidy(sentence: string): string {
  let s = sentence
    .replace(HEAT_LABEL, "")
    .replace(TIME_MARKER, "")
    .replace(/^now that\b[^,]*,\s*/i, "")
    .replace(LEAD_WORDS, "")
    .replace(/^(?:make sure|be sure|remember) to\s+/i, "")
    .trim();
  const subject = s.match(SUBJECT);
  if (subject && VERBS.has(firstWord(s.slice(subject[0].length)))) s = s.slice(subject[0].length);
  const purpose = s.search(PURPOSE);
  if (purpose > 0 && s.slice(0, purpose).split(/\s+/).length >= 3) s = s.slice(0, purpose);
  s = s.replace(/\s+([,.;!?])/g, "$1").replace(/\s{2,}/g, " ").replace(/[\s,;—–-]+$/, "").trim();
  s = capitalise(s);
  return /[.!?)]$/.test(s) ? s : `${s}.`;
}

function shorten(text: string): string {
  let s = text;
  if (s.length > MAX_CHARS) s = s.replace(/\s*\([^)]*\)/g, "");
  while (s.length > MAX_CHARS) {
    let comma = s.lastIndexOf(",");
    while (comma >= 40 && /\b(?:and|or|but|the|a|an|with|to|of|in|on|then)$/i.test(s.slice(0, comma))) comma = s.lastIndexOf(",", comma - 1);
    if (comma < 40) break;
    s = `${s.slice(0, comma)}.`;
  }
  if (s.length > MAX_CHARS) {
    const cut = s.lastIndexOf(" ", MAX_CHARS - 1);
    s = `${s.slice(0, cut > 40 ? cut : MAX_CHARS - 1).replace(/[\s,;.]+$/, "")}…`;
  }
  return s;
}

const MAJOR: Technique[] = ["sear", "fry", "saute", "roast", "bake", "broil", "simmer", "boil", "marinate", "knead", "fold", "whisk", "plate"];

type Kind = "major" | "minor" | "loose";

interface Sentence {
  raw: string;
  text: string;
  match: TechniqueMatch | null;
  hasTimer: boolean;
  kind: Kind;
}

function makeSentence(raw: string, text: string): Sentence {
  const lead = raw.replace(/^now that\b[^,]*,\s*/i, "");
  const purpose = lead.search(PURPOSE);
  const timed = purpose > 0 ? lead.slice(0, purpose) : lead;
  let match = analyzeTechnique(text);
  const hasTimer = !!detectTimer(timed, match?.technique ?? "rest");
  if (!match && hasTimer) match = { technique: "rest", weak: true, generic: true };
  let kind: Kind = "loose";
  if (match && !match.weak) kind = MAJOR.includes(match.technique) ? "major" : "minor";
  else if (match && (hasTimer || match.cook || detectHeat(raw))) kind = "major";
  return { raw: timed, text, match, hasTimer, kind };
}

function toSentences(paragraph: string): Sentence[] {
  const out: Sentence[] = [];
  for (const raw of splitSentences(paragraph)) {
    if (TIP.test(raw)) break;
    if (!isInstruction(raw.replace(HEAT_LABEL, ""))) continue;
    const text = tidy(raw);
    if (text.length <= MAX_CHARS) {
      out.push(makeSentence(raw, text));
      continue;
    }
    const parts = text.split(/,\s+(?:and\s+)?then\s+|;\s+/);
    for (const part of parts) {
      const piece = parts.length > 1 ? tidy(part) : text;
      out.push(makeSentence(parts.length > 1 ? piece : raw, piece));
    }
  }
  return out;
}

function paragraphsOf(text: string): string[] {
  const all = text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const isItem = (p: string) => !/[.!?:]$/.test(p) && p.split(/\s+/).length <= 14;
  const out: string[] = [];
  for (let i = 0; i < all.length; i++) {
    if (!/:$/.test(all[i]) || !all[i + 1] || !isItem(all[i + 1])) {
      out.push(all[i]);
      continue;
    }
    const items: string[] = [];
    while (all[i + 1] && isItem(all[i + 1])) items.push(all[++i]);
    const doable = items.filter((x) => VERBS.has(firstWord(x)));
    if (doable.length * 2 >= items.length) out.push(...doable.map((x) => `${x}.`));
    else out.push(`${all[i - items.length].replace(/:$/, "")}: ${items.join(", ")}.`);
  }

  const isHeading = (p: string) => !/[.!?:,]/.test(p) && p.split(/\s+/).length <= 7 && !/\d/.test(p);
  const kept = out.filter((p, i) => !(isHeading(p) && i < out.length - 1));
  return kept.length ? kept : out.slice(-1);
}

interface Group {
  kind: "major" | "minor";
  sentences: Sentence[];
  strong?: Technique;
  weak?: Technique;
  hasTimer: boolean;
}

function strongOf(s: Sentence): Technique | undefined {
  return s.kind === "major" && s.match && !s.match.weak ? s.match.technique : undefined;
}

const BOWL: Technique[] = ["whisk", "fold", "knead", "marinate"];
const sameFamily = (a: Technique, b: Technique) => a === b || (BOWL.includes(a) && BOWL.includes(b));

function conflicts(cur: Group, s: Sentence): boolean {
  if (s.hasTimer && cur.hasTimer) return true;
  if (s.match?.generic) return false;
  const next = s.match?.technique;
  const now = cur.strong ?? cur.weak;
  if (!next || !now) return false;
  if (strongOf(s) && cur.strong) return !sameFamily(next, now);
  return TECHNIQUE_STATION[next] !== TECHNIQUE_STATION[now];
}

function buildGroups(sentences: Sentence[]): Group[] {
  const groups: Group[] = [];
  let pending: Sentence[] = [];
  const absorb = (g: Group, s: Sentence) => {
    g.sentences.push(...pending, s);
    pending = [];
    g.strong ??= strongOf(s);
    if (s.kind === "major" && !g.weak && s.match?.weak) g.weak = s.match.technique;
    g.hasTimer ||= s.hasTimer;
  };

  for (const s of sentences) {
    const cur = groups[groups.length - 1];
    if (s.kind === "loose") {
      if (cur?.kind === "major") cur.sentences.push(s);
      else pending.push(s);
    } else if (s.kind === "minor") {
      if (cur) absorb(cur, s);
      else {
        groups.push({ kind: "minor", sentences: [...pending, s], hasTimer: s.hasTimer });
        pending = [];
      }
    } else if (cur?.kind === "major" && !conflicts(cur, s)) {
      absorb(cur, s);
    } else {
      groups.push({
        kind: "major",
        sentences: [...pending, s],
        strong: strongOf(s),
        weak: s.match?.weak ? s.match.technique : undefined,
        hasTimer: s.hasTimer,
      });
      pending = [];
    }
  }
  if (pending.length) {
    const last = groups[groups.length - 1];
    if (last) last.sentences.push(...pending);
    else groups.push({ kind: "minor", sentences: pending, hasTimer: false });
  }
  return groups;
}

function score(s: Sentence, groupStrong?: Technique): number {
  const base = s.kind === "major" ? (strongOf(s) ? 4 : 2.5) : s.kind === "minor" ? 2.5 : s.match ? 1 : 0;
  const same = groupStrong && s.match?.technique === groupStrong ? 1 : 0;
  return base + same + (s.hasTimer ? 1 : 0) + (detectHeat(s.raw) ? 0.5 : 0) + (CUE_RE.test(s.raw) ? 0.5 : 0);
}

function shown(group: Group): { text: string; raw: string } {
  const ranked = group.sentences
    .map((s, i) => ({ s, i, score: score(s, group.strong) }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  let chosen = ranked.slice(0, MAX_SHOWN);
  if (chosen.map((c) => c.s.text).join(" ").length > MAX_CHARS) chosen = chosen.slice(0, 1);
  chosen.sort((a, b) => a.i - b.i);
  return { text: shorten(chosen.map((c) => c.s.text).join(" ")), raw: chosen.map((c) => c.s.raw).join(" ") };
}

function techniqueOf(group: Group): TechniqueMatch | null {
  if (group.strong) return { technique: group.strong, weak: false };
  if (group.kind === "minor") {
    const minors = group.sentences.filter((s) => s.kind === "minor");
    const all = minors.length ? analyzeTechnique(minors.map((s) => s.text).join(" ")) : null;
    if (all) return all;
  }
  return group.sentences.find((s) => s.kind === "major" && s.match)?.match ?? group.sentences.find((s) => s.match)?.match ?? null;
}

const COOKING: Technique[] = ["sear", "fry", "saute", "roast", "bake", "broil", "simmer", "boil"];

export function structureStep(text: string, ingredients: Ingredient[], context: StepContext, name?: string): Step[] {
  let sentences = paragraphsOf(text).flatMap(toSentences);
  const required = sentences.filter((s) => !OPTIONAL.test(s.raw.replace(HEAT_LABEL, "")));
  if (required.length) sentences = required;
  const nameText = name?.trim().replace(/[.:!]+$/, "");

  if (!sentences.length) {
    const fallback = nameText || splitSentences(text.replace(/\s+/g, " ").trim())[0] || "";
    if (!fallback) return [];
    sentences = [makeSentence(fallback, tidy(fallback))];
  }

  return buildGroups(sentences).map((group): Step => {
    const { text: stepText, raw: shownRaw } = shown(group);
    const raw = group.sentences.map((s) => s.raw).join(" ");
    const match = techniqueOf(group);

    let technique: Technique | undefined = match?.technique;
    if (match?.generic && context.last) technique = context.last;
    technique ??= nameText ? analyzeTechnique(nameText)?.technique : undefined;
    if (!technique) {
      technique = "rest";
      context.warnings.push(`Step ${context.count + 1} ("${stepText.slice(0, 40)}") has no clear technique, so it is marked as resting.`);
    }
    context.count += 1;

    const cooks = COOKING.includes(technique);
    if (cooks) context.last = technique;

    const heat = cooks ? detectHeat(raw) : undefined;
    const timed = group.sentences.find((x) => x.hasTimer);
    const timer = detectTimer(timed ? timed.raw : raw, technique);
    const cue = detectCue(shownRaw);
    return {
      text: stepText,
      technique,
      ...(heat && { heat }),
      ...(timer && { timer }),
      ...(cue && { cue }),
      uses: linkIngredients(group.sentences.map((s) => s.text).join(" "), ingredients, context.used),
    };
  });
}

export function attachUnusedIngredients(steps: Step[], ingredients: Ingredient[], context: StepContext): void {
  if (!steps.length) return;
  const passive: Technique[] = ["whisk", "marinate", "season"];
  const preferred = steps.findIndex((s) => passive.includes(s.technique));
  const target = preferred >= 0 ? preferred : 0;
  for (const ing of ingredients) {
    if (context.used.has(ing.id)) continue;
    steps[target].uses.push({ ingredientId: ing.id });
    context.used.add(ing.id);
    context.warnings.push(`"${ing.name}" isn't mentioned in any step, so it was added to step ${target + 1}.`);
  }
}
