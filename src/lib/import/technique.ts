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
  [["bake", new RegExp(String.raw`\bbak(?:e|es|ing)\b(?! (?:soda|powder|pan|sheet|dish|tray|rack|paper)\b)|${NOUNISH}\bbaked\b`)]],
  [["broil", new RegExp(String.raw`\b(?:broil|grill)(?:s|ing)?\b|${NOUNISH}\b(?:broiled|grilled)\b`)]],
  [[
    "simmer",
    new RegExp(
      String.raw`\b(?:simmer(?:s|ing)?|poach(?:es|ing)?|braise[s]?|braising|stew(?:s|ing)?|parboils?)\b|${NOUNISH}\b(?:simmered|poached|braised|stewed|parboil(?:ed|ing)|steam(?:ed|ing|s)?)\b|(?<!\b(?:some|the|a|an|your|more|excess|any|of|hot|with|from|that|this|its|release|generate) )\bsteam\b`,
    ),
  ]],
  [["boil", new RegExp(String.raw`\bboils?\b|\bblanch(?:es|ing)?\b|${NOUNISH}\b(?:boil(?:ed|ing)|blanched)\b`)]],
  [["marinate", /\b(?:marinat(?:e|ed|es|ing)|massage(?= [^.]*\b(?:marinade|sauce|meat|pork|beef|chicken|lamb|fish|salmon|shrimp|tofu|steak|ribs)\b))\b/]],
  [["knead", /\bknead(?:ed|ing)?\b/]],
  [["fold", /\bfold(?:ed|ing)?\b/]],
  [["whisk", /\b(?:whisk(?:ing)?|beat(?:ing)?|(?<!\b(?:the|a|an|your) (?:[a-z-]+ ){0,1})mix(?:es|ing)?|combin(?:e|es|ed|ing)|blend(?:ing)?|mash)\b|\b(?:prepare|create|make) (?:the |a |our |your )?(?:[a-z]+ ){0,2}(?:sauce|marinade|glaze|slurry|dressing|batter|seasoning)\b|\badd\b[^.;]*\b(?:to|into) (?:a|the|another|an|your) (?:[a-z-]+ ){0,2}bowl\b|\bcrack(?:ed|ing|s)?\b[^.;]*\bbowl\b|\bsmash(?:ed|ing)?\b[^.;]*\bpaste\b|\bstir(?= (?:together|well|until|to combine|to coat|thoroughly))/]],
  [[
    "plate",
    new RegExp(
      String.raw`\b(?:serv(?:e|ing)|garnish(?:ing)?|enjoy|plating)\b|(?<!\b(?:a|an|the|flat|serving|dinner|your|large|small|clean|warm|paper|this|each|that) )\bplate\b`,
    ),
  ]],
  COOK_HERE,
  [
    ["slice", /\bcut\b[^.;]*\binto\b[^.;]*\b(?:slices|strips|rounds|matchsticks)\b/],
    ["chop", /\bcut\b[^.;]*\binto\b[^.;]*\b(?:chunks|cubes|pieces|bits|dice)\b/],
  ],
  [
    ["chop", /\b(?:chop(?:ping)?|dic(?:e|ing))\b/],
    ["mince", /\b(?:minc(?:e|ing)|crush(?:ing)?|grat(?:e|ing))\b/],
    ["slice", /(?<!\b(?:a|an|the|initial|thin|few|of|pork|beef|ginger|\d) )\bslic(?:e|ing)\b(?! of\b)|\b(?:julienne|shred(?:ding)?|carve)\b/],
  ],
  [
    ["slice", /\b(?:cut(?:ting)?|trim(?:ming)?|(?<!\b(?:mandarin|orange|tangerine|citrus|lemon|lime|grapefruit|dried|fruit) )peel(?:ing)?)\b/],
  ],
  [["drain", /\b(?:drain(?:ing)?|wash(?:ing)?|rins(?:e|ing)|soak(?:ing)?|strain(?:ing)?|pat dry|rehydrat(?:e|ing)|submerg(?:e|ing))\b|\b(?:discard|pour (?:out|off)|dump)\b[^.;]*\bwater\b|\b(?:place|put|plunge|dunk|transfer)\b[^.;]*\b(?:cold|ice|iced) water\b/]],
  [[
    "season",
    /\b(?:season(?:ing|s)?|sprinkle|coat|dredge|rub|dust|taste|brush(?:ing)?|baste|basting)\b|\badd (?:the |some |a bit of |more )?(?:\w+ )?(?:salt|pepper)\b/,
  ]],
  [["chill", /\b(?:refrigerat(?:e|ing)|chill(?:ing)?|freez(?:e|ing))\b|\bin (?:the |your )?(?:fridge|refrigerator|freezer)\b/]],
  [["rest", /\bset\b[^.,;]{0,25}\baside\b|\bcool(?:ing)?\b|\blet (?:it |them |the \w+ )?(?:stand|sit|rest|cool)\b|\brest(?:ing)?\b(?! of\b)/]],
];

const WEAK: Rule[] = [
  ["simmer", /\bcover(?:ed|ing)?\b[^.,;]{0,15}\b(?:wok|pot|pan|lid)\b|\bsteamer\b|\b(?:put|place) the lid\b/],
  ["fry", /\bwok\b/],
  ["saute", /\b(?:skillet|frying pan|saucepan)\b|(?<!\b(?:baking|roasting|cake|loaf|pie|muffin|sheet|bread|drip) )\bpan\b/],
  ["saute", /\bheat\b\s+(?:\w+\s+){0,2}(?:oil|butter|fat)\b/],
  ["boil", /\bpot\b/],
  ["simmer", /\brice cooker\b/],
  ["bake", /\b(?:oven|preheat(?:ed|ing)?)\b/],
  ["whisk", /\b(?:stir|toss)\b/],
];

const COOK = /(?<!\b(?:easier|faster|quicker|even|evenly|better|the|your|during|after|before|finished) )\bcook(?:ed|ing|s)?\b(?! (?:oil|wine|spray|time|liquid))/;

export interface TechniqueMatch {
  technique: Technique;
  weak: boolean;
  /** Came from the word "cook" rather than a specific verb. */
  cook?: boolean;
  /** A bare "cook" with no pot, oven or pan to go on, so the surrounding steps are the better guide. */
  generic?: boolean;
  /** Decided by a generic mixing verb (mix, stir, toss, combine, fold) that means whatever vessel the food is in. */
  mix?: boolean;
}

const NEGATED = /\b(?:do not|don['’]t|never|avoid|without|no need to)\s+(?:\w+ing\s+|\w+\s+)?/g;
const VESSEL_OUT = /\b(?:take|remove|lift|transfer|move|dump|empty|pour|scoop|slide|discard)\b[^.;]*\b(?:out of|from|off|out)\b[^.;]*\b(?:wok|pan|pot|skillet|oven|steamer|lid)\b|\b(?:take|lift|remove)\b[^.;]*\b(?:bowl|plate|dish)\b[^.;]*\b(?:out of|from|off)\b/;

function withoutClauses(text: string): string {
  return text
    .replace(NEGATED, " ")
    .replace(/\buntil\b[^,.;]*/g, " ")
    .replace(/\bbefore\b[^,.;]*/g, " ")
    .replace(/\b(?:to (?:ensures?|help|prevent|avoid|allow|make sure|be \w+)|so that|so (?:you|they|it)(?:'re|'ll|'s| can| will| don't| won't| are| is)|in order to|which (?:helps|allows|means|will|makes|ensures)|because)\b[^.;]*/g, " ");
}

const BOWL_SETUP = /^(?:add|crack|prepare|create|make)/;
const SOAKING = /\b(?:soak|rins|wash|drain|strain|rehydrat)\w*/;
const BOWL_VERB = /\b(?:whisk|beat|blend|mash|crack|smash|bowl|batter|marinade|slurry|dressing)\w*\b/;

function isMixing(technique: Technique, word: string, text: string): boolean {
  if (technique !== "whisk" && technique !== "fold") return false;
  return /^(?:mix|combin|stir|fold)/.test(word) && !BOWL_VERB.test(text);
}

const PROTEIN = /\b(?:chicken|pork|beef|lamb|duck|shrimp|prawns?|fish|fillets?|salmon|cod|tofu|meat|steak|ribs|drumsticks|wings)\b/;

/** Fixes a few readings that depend on the whole sentence rather than its first verb. */
function refine(m: TechniqueMatch | null, t: string): TechniqueMatch | null {
  if (!m) return m;
  // Mixing the meat into its marinade is marinating; mixing the marinade on its own ("the beef marinade", "chicken powder") is not.
  const meat = t.replace(/\b\w+ (?=marinade\b)|\b(?:chicken|beef|pork|fish|shrimp) (?:powder|bouillon|broth|stock|sauce)\b/g, "");
  if (m.technique === "whisk" && PROTEIN.test(meat) && /\b(?:marinade|flavou?rs|seasonings?)\b/.test(t) && !/\b(?:wok|pan|pot|skillet)\b/.test(t)) {
    return { technique: "marinate", weak: false };
  }
  if (m.technique === "plate" && /\bfor (?:now|later)\b/.test(t)) return { technique: "rest", weak: false };
  return m;
}

function matchText(text: string): TechniqueMatch | null {
  const t = text.replace(/\([^)]*\)/g, " ");
  return refine(matchWords(t), t);
}

function matchWords(t: string): TechniqueMatch | null {
  for (const group of GROUPS) {
    if (group === COOK_HERE) {
      if (!COOK.test(t)) continue;
      if (/\boven\b/.test(t)) return { technique: "bake", weak: true, cook: true };
      if (/\b(?:pot|soup|water|covered|lid|rice cooker|steamer)\b/.test(t)) return { technique: "simmer", weak: true, cook: true };
      if (/\bwok\b/.test(t)) return { technique: "fry", weak: true, cook: true };
      return { technique: "saute", weak: true, cook: true, generic: true };
    }
    let best: { technique: Technique; index: number; word: string } | null = null;
    for (const [technique, pattern] of group) {
      const m = pattern.exec(t);
      if (m && (!best || m.index < best.index)) best = { technique, index: m.index, word: m[0] };
    }
    if (best && BOWL_SETUP.test(best.word) && SOAKING.test(t)) continue;
    if (best) return { technique: best.technique, weak: false, ...(isMixing(best.technique, best.word, t) && { mix: true }) };
  }
  if (VESSEL_OUT.test(t)) return { technique: /\b(?:water|liquid|oil|broth|stock)\b/.test(t) ? "drain" : "rest", weak: true };
  for (const [technique, pattern] of WEAK) {
    if (pattern.test(t)) return { technique, weak: true, ...(technique === "whisk" && { mix: true }) };
  }
  return null;
}

const TAKES_OUT = /^(?:carefully |gently |then )?(?:remove|take|lift|scoop|pull|discard|transfer)\b/;
const LEAD_CONDITION = /^(?:once|when|as|after|while|if)\b[^,]*,\s*/;

export function analyzeTechnique(text: string): TechniqueMatch | null {
  const t = withoutClauses(text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
  const stripped = t.trim().replace(LEAD_CONDITION, "");
  if (stripped !== t.trim() && stripped.split(/\s+/).length >= 3) {
    const main = matchText(stripped);
    if (main && (!main.weak || main.cook)) return main;
    if (!main && TAKES_OUT.test(stripped)) return { technique: "rest", weak: false };
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
