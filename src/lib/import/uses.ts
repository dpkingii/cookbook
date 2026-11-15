import type { Ingredient, StepUse } from "@/lib/recipe/types";

const ALIASES: [RegExp, string][] = [
  [/\b(?:green|spring) onions?\b|\bscallions?\b/g, "scallion"],
  [/\bcoriander\b/g, "cilantro"],
  [/\bcorn ?starch\b/g, "cornstarch"],
];

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(?:ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(?:ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

function words(text: string): string[] {
  let t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [re, to] of ALIASES) t = t.replace(re, to);
  return (t.match(/[a-z0-9]+/g) ?? []).map(stem);
}

function phrasesOf(name: string): string[][] {
  const out: string[][] = [];
  for (const alt of name.replace(/\([^)]*\)/g, " ").split(/\s+(?:and|or)\s+|\s*\/\s*/i)) {
    const w = words(alt);
    for (let i = 0; i < w.length; i++) out.push(w.slice(i));
  }
  return out;
}

function find(haystack: string[], needle: string[], covered: boolean[]): number {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j] || covered[i + j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Links a step to every ingredient whose name (or head noun) it mentions. When several
 * ingredient lines share a name, each mention consumes the next unused line.
 */
export function linkIngredients(text: string, ingredients: Ingredient[], used: Set<string>): StepUse[] {
  const tokens = words(text);
  const covered = tokens.map(() => false);

  const groups = new Map<string, Ingredient[]>();
  for (const ing of ingredients) {
    const key = words(ing.name).join(" ");
    groups.set(key, [...(groups.get(key) ?? []), ing]);
  }

  const all = [...groups.entries()].flatMap(([key, lines]) =>
    phrasesOf(lines[0].name).map((phrase) => ({ key, lines, phrase, whole: phrase.length === words(lines[0].name).length })),
  );

  // A bare head noun ("sauce", "oil") is ambiguous when several ingredients share it: the ingredient
  // actually named that word wins, otherwise the first one listed.
  const owner = new Map<string, string>();
  for (const c of all) {
    if (c.phrase.length !== 1) continue;
    const current = owner.get(c.phrase[0]);
    if (!current || (c.whole && !all.some((o) => o.key === current && o.whole && o.phrase.length === 1))) {
      owner.set(c.phrase[0], c.key);
    }
  }
  const candidates = all.filter((c) => c.phrase.length > 1 || owner.get(c.phrase[0]) === c.key);
  candidates.sort((a, b) => b.phrase.length - a.phrase.length);

  const matched = new Set<string>();
  for (const { key, phrase } of candidates) {
    if (!phrase.length || matched.has(key)) continue;
    const at = find(tokens, phrase, covered);
    if (at < 0) continue;
    for (let j = 0; j < phrase.length; j++) covered[at + j] = true;
    matched.add(key);
  }

  const picked = new Map<Ingredient, StepUse>();
  for (const key of matched) {
    const lines = groups.get(key)!;
    const fresh = lines.find((l) => !used.has(l.id));
    if (fresh) picked.set(fresh, { ingredientId: fresh.id });
    else picked.set(lines[0], { ingredientId: lines[0].id, portion: 0 });
  }

  const uses = ingredients.filter((i) => picked.has(i)).map((i) => picked.get(i)!);
  for (const u of uses) used.add(u.ingredientId);
  return uses;
}
