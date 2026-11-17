import type { Heat, Technique } from "@/lib/recipe/types";
import { detectHeat, type TechniqueMatch } from "./technique";

/** What the recipe has set up so far: which pan or pot the food is in and how hot it is. */
export interface Vessel {
  /** Cooking technique of the pan or pot the food is in. */
  vessel?: Technique;
  /** Oven technique of the food that went into the oven and has not come out. */
  oven?: Technique;
  /** The recipe cooks meat or fish and no dough, so oven cooking is roasting rather than baking. */
  roasts?: boolean;
  /** The food has been taken out, so the vessel is no longer what a bare "stir" refers to. */
  emptied?: boolean;
  /** The latest sentence put the food in a bowl, so a bare "mix" stays there until something goes on the stove. */
  bowl?: boolean;
  heat?: Heat;
}

const ON_STOVE: Technique[] = ["sear", "fry", "saute", "simmer", "boil"];
const BOILING: Technique[] = ["simmer", "boil"];
const OVEN: Technique[] = ["roast", "bake", "broil"];
const HEATS: Heat[] = ["low", "medium", "high"];

const LEAVES =
  /\b(?:remove|take|lift|transfer|move|scoop|dump|slide|empty|plate)\b[^.;]*\b(?:out of|from|off|out|aside|onto|to (?:a|the|another) (?:[a-z-]+ ){0,2}(?:bowl|plate|dish|colander|tray|board))\b|\bset\b[^.,;]{0,25}\baside\b|\bdrain/;
const IN_VESSEL = /^(?:add|pour|put|place|return|drizzle|sprinkle|swirl|spread|flip|turn|press|push|scrape|break|reduce|lower|raise|cover|uncover|shake|tilt|let|keep|continue|wait|stir|give|bring|slowly|gently|constantly)\b/;
const MOVING = /^(?:remove|take|lift|scoop|plate|serve|discard|drain|rinse|wash|uncover|repeat|transfer|move|dump|set)\b/;
const LEAD = /^(?:while|as|meanwhile|in the meantime|once|when|after|before)\b[^,]*,\s*/;
const ADJECTIVE_MARINATED = /\bmarinat(?:ed|ing)\b/;
const MARINATE_VERB = /\bmarinat(?:e|es)\b|\b(?:let|leave|allow|start|begin)\b[^.]*\bmarinat/;
const LID = /\b(?:lid|cover)\b/;
const BOWL = /\bbowl\b/;
const COMPOSE = /^(?:mix|combine)\b(?! in\b)[^.]*,[^.]*(?:,|\band\b)/;
const AWAY_FROM_VESSEL = /\b(?:bowl|plate|board|knife|colander|fridge|oven)\b/;

function vesselIn(text: string): Technique | undefined {
  if (/\bwok\b/.test(text)) return "fry";
  if (/\b(?:skillet|frying pan|pan)\b/.test(text)) return "saute";
  if (/\b(?:pot|saucepan|stockpot|dutch oven)\b/.test(text)) return /\b(?:soup|broth|stock|sauce|stew|congee|porridge)\b/.test(text) ? "simmer" : "boil";
  return undefined;
}

const IN_WATER = /\bboil|\b(?:noodles?|pasta|spaghetti|macaroni|dumplings?|wontons?|blanch\w*|parboil\w*)\b/;

/** Stirring or adding things to a pot that is already boiling is simmering, unless the pot is water for noodles or blanching. */
const settle = (vessel: Technique, text: string): Technique => (vessel === "boil" && !IN_WATER.test(text) ? "simmer" : vessel);

/**
 * Re-reads one sentence in light of the vessel the food is in: stir, mix, toss and a bare "cook" on the
 * stove take the vessel's technique, while the same verbs with a bowl, or after the food came out, stay in the bowl.
 */
export function inheritTechnique(text: string, match: TechniqueMatch | null, state: Vessel): TechniqueMatch | null {
  const whole = text.toLowerCase();
  const lead = LEAD.exec(whole)?.[0] ?? "";
  const t = whole.slice(lead.length);
  const leaving = LID.test(t) ? null : LEAVES.exec(t);
  const leaves = leaving !== null;
  const live = state.vessel && !state.emptied;
  const named = vesselIn(t);
  let m = match;

  const inBowl = !named && (BOWL.test(t) || !!state.bowl);
  if (m?.mix && !inBowl && !COMPOSE.test(t)) {
    const technique = live ? state.vessel : named;
    if (technique) m = { technique: settle(technique, t), weak: false };
  } else if (m?.technique === "marinate" && !m.weak && ADJECTIVE_MARINATED.test(t) && !MARINATE_VERB.test(t) && !inBowl && (live || named)) {
    m = { technique: (live ? state.vessel : named)!, weak: false };
  } else if (m && m.technique === "whisk" && !m.weak && named && !inBowl) {
    m = { technique: settle(live ? state.vessel! : named, t), weak: false };
  } else if (m?.weak && live && ON_STOVE.includes(m.technique) && !m.cook && BOILING.includes(m.technique) === BOILING.includes(state.vessel!)) {
    m = { ...m, technique: state.vessel! };
  } else if (m?.generic && (live || state.oven || state.vessel)) {
    m = { technique: (live ? state.vessel : (state.oven ?? state.vessel))!, weak: true, cook: true };
  } else if (!m && live && !inBowl && IN_VESSEL.test(t) && !AWAY_FROM_VESSEL.test(t) && !leaves && !MOVING.test(t)) {
    m = { technique: settle(state.vessel!, t), weak: true };
  }

  const leadVessel = vesselIn(lead);
  if (leadVessel && (!state.vessel || state.emptied)) {
    state.vessel = leadVessel;
    state.emptied = false;
  }
  if (leaves) state.emptied = true;
  if (leaves && /\boven\b/.test(t)) state.oven = undefined;
  if (BOWL.test(t)) state.bowl = true;
  else if (named) state.bowl = false;
  if (!m) return m;
  if (m.technique === "bake" && state.roasts) m = { ...m, technique: "roast" };
  const leavesAfterCooking = leaving !== null && leaving.index > 0;
  if (ON_STOVE.includes(m.technique) && !m.generic && (!m.weak || !live)) {
    if (state.vessel && BOILING.includes(state.vessel) !== BOILING.includes(m.technique)) state.heat = undefined;
    state.vessel = m.technique;
    state.emptied = leavesAfterCooking;
    if (!BOWL.test(t)) state.bowl = false;
  } else if (OVEN.includes(m.technique) && !leaves) {
    state.oven = m.technique;
    state.vessel = undefined;
    state.heat = undefined;
  } else if (m.technique === "plate") {
    state.vessel = undefined;
    state.oven = undefined;
    state.heat = undefined;
  }
  return m;
}

const LOWER = /\b(?:lower|reduce|decrease|drop|turn(?:ing)? down)\b[^.;]*\bheat\b|\bheat\b[^.;]*\b(?:down|lower)\b/;
const RAISE = /\b(?:raise|increase|turn(?:ing)? up|bump up)\b[^.;]*\bheat\b|\bheat\b[^.;]*\bup\b/;
const OFF = /\b(?:turn(?:ed|ing)?|switch(?:ed)?|shut|take|remove)\b[^.;]*\b(?:off|from) (?:the )?(?:heat|stove|burner)\b|\boff (?:the )?heat\b|\b(?:turn|switch|shut)\b[^.;]*\b(?:heat|stove|flame|burner) off\b/;

/** Reads the heat a step cooks at, remembering changes ("lower the heat", "turn off the heat") for the steps after it. */
export function stepHeat(sentences: string[], state: Vessel): Heat | undefined {
  const carried = state.heat;
  let changed: Heat | undefined;
  let offFirst = false;
  for (const [i, s] of sentences.entries()) {
    const t = s.toLowerCase();
    if (OFF.test(t)) {
      state.heat = undefined;
      offFirst ||= i === 0;
      continue;
    }
    const stated = detectHeat(s);
    if (stated) state.heat = stated;
    else if (LOWER.test(t)) state.heat = HEATS[Math.max(0, HEATS.indexOf(state.heat ?? "medium") - 1)];
    else if (RAISE.test(t)) state.heat = HEATS[Math.min(2, HEATS.indexOf(state.heat ?? "medium") + 1)];
    else continue;
    changed ??= state.heat;
  }
  return changed ?? (offFirst ? undefined : carried);
}

const MEATY = /\b(?:pork|beef|chicken|duck|lamb|turkey|ham|bacon|sausage|ribs?|steak|salmon|fish|cod|goose)\b/i;
const DOUGHY = /\b(?:flour|yeast|baking powder|dough)\b/i;

export function roastsFrom(ingredientNames: string[]): boolean {
  return ingredientNames.some((n) => MEATY.test(n)) && !ingredientNames.some((n) => DOUGHY.test(n));
}
