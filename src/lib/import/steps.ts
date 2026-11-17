import { TECHNIQUE_STATION } from "@/lib/recipe/types";
import type { Ingredient, Step, StepUse, Technique } from "@/lib/recipe/types";
import { inheritTechnique, roastsFrom, stepHeat, type Vessel } from "./context";
import { analyzeTechnique, detectHeat, type TechniqueMatch } from "./technique";
import { detectDelayedTimer, detectTimer, PASSIVE } from "./timer";
import { linkIngredients } from "./uses";
import {
  ASIDE, CUE_RE, HEAT_LABEL, MAX_CHARS, OPTIONAL, PURPOSE, TIP, detectCue, isInstruction, paragraphsOf, shorten, splitSentences, tidy,
} from "./sentences";
export { detectCue, splitSentences, isInstruction };

export interface StepContext extends Vessel {
  used: Set<string>;
  warnings: string[];
  /** Steps produced so far. */
  count: number;
  /** Ingredients the latest combining step put into one bowl, which a later "the sauce" refers back to. */
  mix?: string[];
  /** The step produced last, which a later "after 2 minutes, flip" gives its timer to. */
  previous?: Step;
  /** Keep text that holds no instruction as a step instead of dropping it. */
  lenient?: boolean;
}

export function createStepContext(lenient = false): StepContext {
  return { used: new Set(), warnings: [], count: 0, lenient };
}

const MAX_SHOWN = 2;

const MAJOR: Technique[] = ["sear", "fry", "saute", "roast", "bake", "broil", "simmer", "boil", "marinate", "knead", "fold", "whisk", "plate"];

type Kind = "major" | "minor" | "loose";

interface Sentence {
  raw: string;
  text: string;
  match: TechniqueMatch | null;
  hasTimer: boolean;
  kind: Kind;
}

function kindOf(match: TechniqueMatch | null, hasTimer: boolean, raw: string): Kind {
  if (match && !match.weak) return MAJOR.includes(match.technique) ? "major" : "minor";
  if (match && (hasTimer || match.cook || detectHeat(raw))) return "major";
  return "loose";
}

function makeSentence(raw: string, text: string): Sentence {
  const lead = raw.replace(/^now that\b[^,]*,\s*/i, "");
  const purpose = lead.search(PURPOSE);
  const timed = purpose > 0 ? lead.slice(0, purpose) : lead;
  let match = analyzeTechnique(text);
  const hasTimer = !!detectTimer(timed, match?.technique ?? "rest");
  if (!match && hasTimer) match = { technique: "rest", weak: true, generic: true };
  return { raw: timed, text, match, hasTimer, kind: kindOf(match, hasTimer, raw) };
}

function toSentences(paragraph: string): Sentence[] {
  const out: Sentence[] = [];
  for (const raw of splitSentences(paragraph)) {
    if (TIP.test(raw)) break;
    if (!isInstruction(raw.replace(HEAT_LABEL, "")) || ASIDE.test(raw.replace(HEAT_LABEL, ""))) continue;
    const text = tidy(raw);
    if (text.length <= MAX_CHARS) {
      out.push(makeSentence(raw, text));
      continue;
    }
    const parts = text.split(/,\s+(?:and\s+)?then\s+|;\s+/);
    for (const [n, part] of parts.entries()) {
      if (n > 0 && !isInstruction(part)) continue;
      const piece = parts.length > 1 ? tidy(part) : text;
      out.push(makeSentence(parts.length > 1 ? piece : raw, piece));
    }
  }
  return out;
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

function shown(group: Group): { text: string; raw: string; sentences: Sentence[] } {
  const ranked = group.sentences
    .map((s, i) => ({ s, i, score: score(s, group.strong) }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  let chosen = ranked.slice(0, MAX_SHOWN);
  if (chosen.map((c) => c.s.text).join(" ").length > MAX_CHARS) chosen = chosen.slice(0, 1);
  chosen.sort((a, b) => a.i - b.i);
  return {
    text: shorten(chosen.map((c) => c.s.text).join(" ")),
    raw: chosen.map((c) => c.s.raw).join(" "),
    sentences: chosen.map((c) => c.s),
  };
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

/** The label has to come from a sentence the cook reads, not from one that was cut to keep the step short. */
function visible(match: TechniqueMatch | null, sentences: Sentence[]): TechniqueMatch | null {
  if (!match || sentences.some((s) => s.match?.technique === match.technique)) return match;
  const strong = sentences.find((s) => s.match && !s.match.weak && s.kind !== "loose");
  return strong?.match ?? sentences.find((s) => s.match)?.match ?? match;
}

const GROUP_WORD = /\b(?:the|this|that|our|your|remaining|reserved|prepared|leftover)\s+(?:(?:remaining|reserved|prepared|leftover)\s+)?(sauce|marinade|seasonings?|slurry|batter|glaze|dressing|syrup|rub|spice mix|mixture)\b/gi;
const COMBINING: Technique[] = ["whisk", "marinate", "fold", "season"];

function groupMembers(text: string, ingredients: Ingredient[], context: StepContext): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(GROUP_WORD)) {
    const word = m[1].toLowerCase().replace(/s$/, "");
    for (const ing of ingredients) if (ing.note && new RegExp(`\\b${word}`, "i").test(ing.note)) ids.add(ing.id);
    for (const id of context.mix ?? []) ids.add(id);
  }
  return [...ids];
}

function addGroup(uses: StepUse[], text: string, ingredients: Ingredient[], context: StepContext): StepUse[] {
  const have = new Set(uses.map((u) => u.ingredientId));
  const extra = groupMembers(text, ingredients, context).filter((id) => !have.has(id));
  if (!extra.length) return uses;
  const added = ingredients
    .filter((i) => extra.includes(i.id))
    .map((i): StepUse => (context.used.has(i.id) ? { ingredientId: i.id, portion: 0 } : { ingredientId: i.id }));
  for (const u of added) context.used.add(u.ingredientId);
  const order = new Map(ingredients.map((i, n) => [i.id, n]));
  return [...uses, ...added].sort((a, b) => order.get(a.ingredientId)! - order.get(b.ingredientId)!);
}

const PREP: Technique[] = ["chop", "mince", "slice", "season", "plate"];
const LONG_PREP: Technique[] = ["chop", "mince", "slice", "season", "drain", "whisk", "fold"];
const LONG_WAIT = 3 * 3600;
const COOKING: Technique[] = ["sear", "fry", "saute", "roast", "bake", "broil", "simmer", "boil"];

export function structureStep(text: string, ingredients: Ingredient[], context: StepContext, name?: string): Step[] {
  let sentences = paragraphsOf(text).flatMap(toSentences);
  const required = sentences.filter((s) => !OPTIONAL.test(s.raw.replace(HEAT_LABEL, "")));
  if (required.length) sentences = required;
  const nameText = name?.trim().replace(/[.:!]+$/, "");

  if (!sentences.length) {
    const first = splitSentences(text.replace(/\s+/g, " ").trim())[0] || "";
    const fallback = context.lenient ? nameText || first : nameText && isInstruction(nameText) ? nameText : "";
    if (!fallback) return [];
    sentences = [makeSentence(fallback, tidy(fallback))];
  }

  context.roasts ??= roastsFrom(ingredients.map((i) => i.name));
  for (const s of sentences) {
    s.match = inheritTechnique(s.text, s.match, context);
    s.kind = kindOf(s.match, s.hasTimer, s.raw);
  }

  return buildGroups(sentences).map((group): Step => {
    const { text: stepText, raw: shownRaw, sentences: read } = shown(group);
    const raw = group.sentences.map((s) => s.raw).join(" ");
    let match = visible(techniqueOf(group), read);
    const timedMatch = group.sentences.find((x) => x.hasTimer)?.match;
    if (match && PREP.includes(match.technique) && timedMatch && !timedMatch.generic && (!timedMatch.weak || timedMatch.cook)) match = timedMatch;

    let technique: Technique | undefined = match?.technique;
    technique ??= nameText ? analyzeTechnique(nameText)?.technique : undefined;
    if (!technique) {
      technique = "rest";
      context.warnings.push(`Step ${context.count + 1} ("${stepText.slice(0, 40)}") has no clear technique, so it is marked as resting.`);
    }
    context.count += 1;

    const cooks = COOKING.includes(technique);

    const onStove = cooks && TECHNIQUE_STATION[technique] !== "oven";
    const carried = stepHeat(group.sentences.map((x) => x.raw), context);
    const heat = onStove ? carried : cooks ? detectHeat(raw) : undefined;
    const timed = group.sentences.find((x) => x.hasTimer);
    let timer = detectTimer(timed ? timed.raw : raw, technique);
    const overnight = /\bovernight\b/i.test(timed ? timed.raw : raw) && COOKING.includes(technique);
    if (timer && timer.seconds >= LONG_WAIT && (LONG_PREP.includes(technique) || overnight)) {
      technique = "rest";
      timer = detectTimer(timed ? timed.raw : raw, technique);
    }
    const prev = context.previous;
    if (!timer && prev && !prev.timer && (COOKING.includes(prev.technique) || PASSIVE.includes(prev.technique))) {
      prev.timer = detectDelayedTimer(raw, prev.technique);
    }
    const cue = detectCue(shownRaw);
    const groupText = group.sentences.map((x) => x.text).join(" ");
    const uses = addGroup(linkIngredients(groupText, ingredients, context.used), groupText, ingredients, context);
    if (COMBINING.includes(technique)) {
      const fresh = uses.filter((u) => u.portion !== 0 && ingredients.find((i) => i.id === u.ingredientId)?.token.shape !== "cube");
      if (fresh.length >= 3) context.mix = fresh.map((u) => u.ingredientId);
    }
    const step: Step = {
      text: stepText,
      technique,
      ...(heat && { heat }),
      ...(timer && { timer }),
      ...(cue && { cue }),
      uses,
    };
    context.previous = step;
    return step;
  });
}

const SEASONING_WORD = /\b(?:flavou?rs?|seasonings?|spices|marinade|dry ingredients|wet ingredients)\b/i;

export function attachUnusedIngredients(steps: Step[], ingredients: Ingredient[], context: StepContext): void {
  if (!steps.length) return;
  const passive: Technique[] = ["whisk", "marinate", "season"];
  const named = steps.findIndex((s) => SEASONING_WORD.test(s.text));
  const preferred = steps.findIndex((s) => passive.includes(s.technique));
  const target = named >= 0 ? named : preferred >= 0 ? preferred : 0;
  for (const ing of ingredients) {
    if (context.used.has(ing.id)) continue;
    steps[target].uses.push({ ingredientId: ing.id });
    context.used.add(ing.id);
    if (named >= 0) continue;
    context.warnings.push(`"${ing.name}" isn't mentioned in any step, so it was added to step ${target + 1}.`);
  }
}
