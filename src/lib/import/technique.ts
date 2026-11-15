import type { Heat, Technique } from "@/lib/recipe/types";

type Rule = [technique: Technique, pattern: RegExp];

// A preceding determiner marks a participle or noun ("the steamed eggs", "some steam"), not an instruction.
const NOUNISH = String.raw`(?<!\b(?:the|a|an|your|some|of|with|more|these|those|this|that|its|our|excess|any|hot|from|release|generate) )`;

const COOK_HERE = Symbol("generic cook is checked here, after the main verbs and before the prep verbs");

// Highest priority first. Within a group the earliest match wins; groups compete in order.
const GROUPS: (Rule[] | typeof COOK_HERE)[] = [
  [["sear", new RegExp(String.raw`\bsear(?:s|ing)?\b|${NOUNISH}\bseared\b`)]],
  [["fry", /\b(?:stir[- ]?fr(?:y|ies|ied|ying)|deep[- ]?fr(?:y|ying)|pan[- ]?fr(?:y|ying)|fr(?:y|ies|ying)|scramble)\b/]],
  [["saute", /\b(?:saut(?:e|ed|eed|ing|es)|sweat|caramelize|caramelise)\b/]],
  [["roast", new RegExp(String.raw`\broast(?:s|ing)?\b|${NOUNISH}\broasted\b`)]],
  [["bake", new RegExp(String.raw`\bbak(?:e|es|ing)\b(?! (?:soda|powder)\b)|${NOUNISH}\bbaked\b`)]],
  [["broil", new RegExp(String.raw`\b(?:broil|grill)(?:s|ing)?\b|${NOUNISH}\b(?:broiled|grilled)\b`)]],
  [[
    "simmer",
    new RegExp(
      String.raw`\b(?:simmer(?:s|ing)?|poach(?:es|ing)?|blanch(?:es|ing)?|braise[s]?|braising|stew(?:s|ing)?|parboil(?:s|ing)?)\b|${NOUNISH}\b(?:simmered|poached|blanched|braised|stewed|steam(?:ed|ing|s)?)\b|(?<!\b(?:some|the|a|an|your|more|excess|any|of|hot|with|from|that|this|its|release|generate) )\bsteam\b`,
    ),
  ]],
  [["boil", new RegExp(String.raw`\bboil(?:s|ing)?\b|${NOUNISH}\bboiled\b`)]],
  [["marinate", /\b(?:marinat(?:e|ed|es|ing)|massage(?= [^.]*\b(?:marinade|sauce|meat|pork|beef|chicken|lamb|fish|salmon|shrimp|tofu|steak|ribs)\b))\b/]],
  [["knead", /\bknead(?:ed|ing)?\b/]],
  [["fold", /\bfold(?:ed|ing)?\b/]],
  [["whisk", /\b(?:whisk(?:ing)?|beat(?:ing)?|(?<!\b(?:the|a|an|your) (?:[a-z-]+ ){0,1})mix(?:es|ing)?|combine|blend(?:ing)?|mash)\b|\bstir(?= (?:together|well|until|to combine|thoroughly))/]],
  [[
    "plate",
    new RegExp(
      String.raw`\b(?:serv(?:e|ing)|garnish(?:ing)?|enjoy|plating)\b|(?<!\b(?:a|an|the|flat|serving|dinner|your|large|small|clean|warm|paper|this|each|that) )\bplate\b`,
    ),
  ]],
  COOK_HERE,
  [
    ["chop", /\b(?:chop(?:ping)?|dic(?:e|ing))\b/],
    ["mince", /\b(?:minc(?:e|ing)|crush(?:ing)?|grat(?:e|ing))\b/],
    ["slice", /\b(?:slic(?:e|es|ing)|cut(?:ting)?|trim(?:ming)?|julienne|shred(?:ding)?|carve|peel(?:ing)?)\b/],
  ],
  [["drain", /\b(?:drain(?:ing)?|wash(?:ing)?|rins(?:e|ing)|soak(?:ing)?|strain(?:ing)?|pat dry)\b/]],
  [[
    "season",
    /\b(?:season(?:ing|s)?|sprinkle|coat|dredge|rub|dust|taste)\b|\badd (?:the |some |a bit of |more )?(?:\w+ )?(?:salt|pepper)\b/,
  ]],
  [["chill", /\b(?:refrigerat(?:e|ing)|chill(?:ing)?|freez(?:e|ing))\b|\bin the (?:fridge|refrigerator|freezer)\b/]],
  [["rest", /\bset\b[^.,;]{0,25}\baside\b|\bcool(?:ing)?\b|\blet (?:it |them |the \w+ )?(?:stand|sit|rest|cool)\b|\brest(?:ing)?\b(?! of\b)/]],
];

const WEAK: Rule[] = [
  ["simmer", /\bcover(?:ed|ing)?\b[^.,;]{0,15}\b(?:wok|pot|pan|lid)\b|\bsteamer\b|\b(?:put|place) the lid\b/],
  ["fry", /\bwok\b/],
  ["saute", /\b(?:skillet|frying pan|saucepan|pan)\b/],
  ["saute", /\bheat\b\s+(?:\w+\s+){0,2}(?:oil|butter|fat)\b/],
  ["boil", /\bpot\b/],
  ["simmer", /\brice cooker\b/],
  ["bake", /\b(?:oven|preheat(?:ed|ing)?)\b/],
  ["whisk", /\b(?:stir|toss)\b/],
];

const COOK = /\bcook(?:ed|ing|s)?\b(?! (?:oil|wine|spray|time|liquid))/;

export interface TechniqueMatch {
  technique: Technique;
  weak: boolean;
  /** Came from the word "cook" rather than a specific verb. */
  cook?: boolean;
  /** A bare "cook" with no pot, oven or pan to go on, so the surrounding steps are the better guide. */
  generic?: boolean;
}

function withoutClauses(text: string): string {
  return text
    .replace(/\buntil\b[^,.;]*/g, " ")
    .replace(/\bbefore\b[^,.;]*/g, " ")
    .replace(/\b(?:to (?:ensures?|help|prevent|avoid|allow|make sure|be \w+)|so that|so (?:you|they|it)(?:'re|'ll|'s| can| will| don't| won't| are| is)|in order to|which (?:helps|allows|means|will|makes|ensures)|because)\b[^.;]*/g, " ");
}

function matchText(t: string): TechniqueMatch | null {
  for (const group of GROUPS) {
    if (group === COOK_HERE) {
      if (!COOK.test(t)) continue;
      if (/\boven\b/.test(t)) return { technique: "bake", weak: true, cook: true };
      if (/\b(?:pot|soup|water|covered|lid|rice cooker|steamer)\b/.test(t)) return { technique: "simmer", weak: true, cook: true };
      return { technique: "saute", weak: true, cook: true, generic: true };
    }
    let best: { technique: Technique; index: number } | null = null;
    for (const [technique, pattern] of group) {
      const m = pattern.exec(t);
      if (m && (!best || m.index < best.index)) best = { technique, index: m.index };
    }
    if (best) return { technique: best.technique, weak: false };
  }
  for (const [technique, pattern] of WEAK) {
    if (pattern.test(t)) return { technique, weak: true };
  }
  return null;
}

const LEAD_CONDITION = /^(?:once|when|as|after|while|if)\b[^,]*,\s*/;

export function analyzeTechnique(text: string): TechniqueMatch | null {
  const t = withoutClauses(text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
  const stripped = t.trim().replace(LEAD_CONDITION, "");
  if (stripped !== t.trim() && stripped.split(/\s+/).length >= 3) {
    const main = matchText(stripped);
    if (main && (!main.weak || main.cook)) return main;
  }
  return matchText(t);
}

export function detectTechnique(text: string): Technique {
  return analyzeTechnique(text)?.technique ?? "rest";
}

const LEVEL = String.raw`medium[\s-]?high|medium[\s-]?low|highest|lowest|maximum|minimum|full|max|high|medium|low`;
const HEAT_SUFFIX = new RegExp(String.raw`\b(${LEVEL})\s*(?:heat|flame|fire|setting|temperature)\b`, "i");
const HEAT_PREFIX = new RegExp(
  String.raw`\b(?:to|on|over|at)\s+(?:the\s+)?(${LEVEL})(?=\s*(?:[,.;)!]|$|\s(?:and|then|until|for|after|while|or)\b))`,
  "i",
);

function levelOf(word: string): Heat {
  const w = word.toLowerCase().replace(/[\s-]/g, "");
  if (w === "mediumlow" || w === "low" || w === "lowest" || w === "minimum") return "low";
  if (w === "mediumhigh" || w === "high" || w === "highest" || w === "maximum" || w === "max" || w === "full") return "high";
  return "medium";
}

function heatFromTemperature(text: string): Heat | undefined {
  const re = /(\d{2,3})\s*(?:[°º]|degrees?)\s*([CFcf])\b|(\d{2,3})\s*([CF])\b/g;
  for (const m of text.matchAll(re)) {
    const sentenceStart = Math.max(text.lastIndexOf(".", m.index), 0);
    const sentence = text.slice(sentenceStart, text.indexOf(".", m.index + 1) + 1 || undefined);
    if (/\b(?:internal|reach(?:es)?|thermometer|registers?)\b/i.test(sentence)) continue;
    const value = Number(m[1] ?? m[3]);
    const celsius = (m[2] ?? m[4]).toUpperCase() === "C";
    if (celsius ? value >= 220 : value >= 425) return "high";
    if (celsius ? value <= 160 : value <= 325) return "low";
    return "medium";
  }
  return undefined;
}

export function detectHeat(text: string): Heat | undefined {
  const a = HEAT_SUFFIX.exec(text);
  const b = HEAT_PREFIX.exec(text);
  const first = a && b ? (a.index <= b.index ? a : b) : (a ?? b);
  if (first) return levelOf(first[1]);

  const temp = heatFromTemperature(text);
  if (temp) return temp;

  const t = text.toLowerCase();
  if (/\bsimmer(?:ed|ing|s)?\b/.test(t)) return "low";
  if (/\buntil\b[^.]{0,25}\bsmoking\b|\bsmoking hot\b|\bboil(?:ed|ing|s)?\b/.test(t)) return "high";
  return undefined;
}
