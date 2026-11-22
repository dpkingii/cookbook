import type { Ingredient, Technique } from "@/lib/recipe/types";
import {
  boxCm,
  Bulb,
  Cap,
  Clove,
  Curl,
  Egg,
  Floret,
  Knob,
  Leaf,
  Pepper,
  Root,
  Round,
  Slab,
  Stalk,
  Strand,
  type Cut,
  type FormName,
  type FormProps,
  type Layout,
} from "@/vendor/mise";

/** Forms that can be drawn on the board. Pool, Dust and Grain are poured or sprinkled, never cut. */
type BoardForm = Extract<FormName, "slab" | "bulb" | "clove" | "knob" | "stalk" | "round" | "root" | "floret" | "leaf" | "egg" | "curl" | "strand" | "pepper" | "cap">;

export interface MiseMatch {
  form: BoardForm;
  props: FormProps[BoardForm];
}

const m = <F extends BoardForm>(form: F, props: FormProps[F]): MiseMatch => ({ form, props });

/**
 * Ingredient names mise can draw, most specific first ("green onion" before "onion").
 * Colours come from mise's own presets, which carry skin, flesh and rings, not the recipe's flat token colour.
 */
const CATALOG: [RegExp, MiseMatch][] = [
  [/\b(scallions?|green onions?|spring onions?)\b/i, m("stalk", { color: "#4f9a3a", base: "#f3f0e2", shape: "scallion" })],
  [/\bleeks?\b/i, m("stalk", { color: "#4a7356", base: "#f0eedb", shape: "leek", seed: 2 })],
  [/\bcelery\b/i, m("stalk", { color: "#86b04e", base: "#d8e6ab", shape: "celery", seed: 3 })],
  [/\blemongrass\b/i, m("stalk", { color: "#a9bd68", base: "#f0e9c2", blush: "#b07a92", shape: "lemongrass", seed: 4 })],
  [/\bshallots?\b/i, m("bulb", { color: "#b8714b", flesh: "#f0d9d3", ring: "#c48f98", shape: "long", seed: 4 })],
  [/\bred onions?\b/i, m("bulb", { color: "#7e2b4c", flesh: "#f4e6ec", ring: "#a3477a", shape: "squat", seed: 2 })],
  [/\bwhite onions?\b/i, m("bulb", { color: "#efe6d2", flesh: "#f7f4e9", shape: "round", seed: 3 })],
  [/\bonions?\b/i, m("bulb", { color: "#c98a3e", flesh: "#f4efdc", shape: "round" })],
  [/\bgarlic\b.*\bheads?\b|\bheads? of garlic\b/i, m("clove", { part: "head" })],
  [/\bgarlic\b/i, m("clove", { part: "clove" })],
  [/\bgalangal\b/i, m("knob", { color: "#e8cdb4", flesh: "#f6ecd6", ring: "#b46a5a", tip: "#e5a2a0", shape: "stout", seed: 2 })],
  [/\bturmeric\b/i, m("knob", { color: "#b9824f", flesh: "#f08a1c", ring: "#8a5a32", shape: "finger", seed: 3 })],
  [/\bginger\b/i, m("knob", { color: "#c9a06a", flesh: "#f2dc8c", ring: "#9c7444", tip: "#e8a0a0", shape: "hand", seed: 3 })],
  [/\bpurple cauliflower\b/i, m("floret", { color: "#7a3f7a", shape: "cauliflower", seed: 3 })],
  [/\bcauliflower\b/i, m("floret", { color: "#f1e8cf", shape: "cauliflower" })],
  [/\b(broccoli|broccolini|tenderstem)\b/i, m("floret", { color: "#3f7a2e", shape: "broccoli" })],
  [/\bcarrots?\b/i, m("root", { color: "#e8742a", shape: "carrot" })],
  [/\b(daikon|mooli|white radish)\b/i, m("root", { color: "#f1eee3", shape: "daikon" })],
  [/\bsweet potato(es)?\b/i, m("root", { color: "#9a4a3a", flesh: "#f29a4a", shape: "potato", seed: 2 })],
  [/\bred potato(es)?\b/i, m("root", { color: "#a8423a", flesh: "#f6ecc8", shape: "potato", seed: 3 })],
  [/\bpotato(es)?\b/i, m("root", { color: "#b8875a", shape: "potato" })],
  [/\bcherry tomato(es)?\b|\bgrape tomato(es)?\b/i, m("round", { color: "#d8321f", flesh: "#e9573c", shape: "tomato", realSize: 2.5 })],
  [/\btomato(es)?\b/i, m("round", { color: "#d8321f", flesh: "#e9573c", shape: "tomato" })],
  [/\blemons?\b/i, m("round", { color: "#f5d23a", flesh: "#f8e79a", shape: "lemon" })],
  [/\blimes?\b/i, m("round", { color: "#6fa53a", flesh: "#cfe39a", shape: "citrus", seed: 3, realSize: 5.5 })],
  [/\boranges?\b/i, m("round", { color: "#f28a1a", flesh: "#f7a23a", shape: "citrus" })],
  [/\bapples?\b/i, m("round", { color: "#b51f2a", flesh: "#f6ecc8", shape: "apple" })],
  [/\b(king|tiger|jumbo) prawns?\b|\bprawns?\b/i, m("curl", { shape: "prawn" })],
  [/\b(peeled|shelled) (shrimp|prawns?)\b/i, m("curl", { peeled: true })],
  [/\bshrimps?\b/i, m("curl", {})],
  [/\b(mung )?bean ?sprouts?\b/i, m("strand", { shape: "sprout" })],
  /** Only bell peppers and fresh chilies: "pepper" alone is black pepper, and chili powder, flakes and oil are not pods. */
  [/\bgreen (bell )?peppers?\b|\bgreen capsicums?\b/i, m("pepper", { color: "#3f8a2a", seed: 2 })],
  [/\byellow (bell )?peppers?\b/i, m("pepper", { color: "#f2c12e", seed: 3 })],
  [/\borange (bell )?peppers?\b/i, m("pepper", { color: "#ee8a1e", seed: 4 })],
  [/\b(red )?bell peppers?\b|\bcapsicums?\b|\bred peppers?\b(?! flakes)/i, m("pepper", { color: "#d42a1e" })],
  [/\b(green chil(i|li|e)(e?s)?|jalape(ñ|n)os?|serranos?)\b(?! (powder|flakes|oil|sauce|paste|crisp))/i, m("pepper", { color: "#4a8a2a", shape: "chili", seed: 2 })],
  [/\b(bird'?s[- ]eye chil(i|li)(e?s)?|thai chil(i|li)(e?s)?)\b/i, m("pepper", { color: "#c8241a", shape: "chili", realSize: 5 })],
  [/\b(red )?chil(i|li|e)(e?s)?\b(?! (powder|flakes|oil|sauce|paste|crisp|bean))/i, m("pepper", { color: "#c8241a", shape: "chili" })],
  [/\bshiitakes?\b/i, m("cap", { color: "#7a4a2a", shape: "shiitake" })],
  [/\b(king )?oyster mushrooms?\b/i, m("cap", { color: "#bfb4a4", shape: "oyster" })],
  [/\b(cremini|crimini|baby bella|chestnut mushrooms?|portobello)\b/i, m("cap", { color: "#9a6a44", seed: 2 })],
  [/\bmushrooms?\b/i, m("cap", { color: "#efe6d6" })],
  /** Flat rice noodles before plain "rice noodles", and egg noodles before any noodle. */
  [/\b(flat rice noodles?|ho fun|chow fun|hor fun|kway teow|rice sticks?)\b/i, m("strand", { shape: "flat" })],
  [/\b(fettuccine|tagliatelle|pappardelle|linguine)\b/i, m("strand", { shape: "flat", color: "#e8c77a" })],
  [/\b(egg noodles?|lo mein|chow mein|ramen|wonton noodles?|yee mein)\b/i, m("strand", { shape: "egg" })],
  [/\b(spaghetti|spaghettini|bucatini|angel hair|vermicelli|udon|soba|noodles?|pasta)\b/i, m("strand", {})],
  /** Eggs never reach the board: a vessel asks for curds, ribbons or bits by cut. */
  [/\beggs?\b|\byolks?\b/i, m("egg", { state: "beaten" })],
  [/\b(thai basil|basil|mint)\b/i, m("leaf", { color: "#3f8a32", shape: "basil" })],
  [/\bparsley\b/i, m("leaf", { color: "#3f7f30", shape: "cilantro", seed: 2 })],
  [/\bcilantro\b|\bcoriander (leaves|sprigs?)\b|\bfresh coriander\b/i, m("leaf", { color: "#4f8a3a", shape: "cilantro" })],
  [/\b(baby )?spinach\b/i, m("leaf", { color: "#2f6a2a", shape: "spinach" })],
  [/\b(bok choy|pak choi|bok choi|shanghai choy)\b/i, m("leaf", { color: "#3d7a33", shape: "bokchoy" })],
  [/\b(red|purple) cabbage\b/i, m("leaf", { color: "#6b2d5c", rib: "#ead8e6", heart: "#f6eef3", shape: "cabbage" })],
  [/\b(napa |savoy |green )?cabbage\b/i, m("leaf", { color: "#9cc47a", shape: "cabbage" })],
  [/\bchicken\b.*\bbreasts?\b/i, m("slab", { color: "#f3bba8", outline: "organic", cookedColor: "#efcf9f", seed: 4 })],
  [/\bchicken\b/i, m("slab", { color: "#efa992", outline: "organic", surface: "fatty", fat: "#fbe6c6", cookedColor: "#e6ad6e" })],
  [/\b(steak|beef)\b/i, m("slab", { color: "#c8414a", outline: "oval", surface: "marbled", rim: true, fat: "#f8e6dc", cookedColor: "#8c4a36" })],
  [/\bpork\b/i, m("slab", { color: "#efb0a6", outline: "oval", rim: true, fat: "#fbf1e6", cookedColor: "#e4b88c", seed: 3 })],
  [/\b(salmon|trout)\b/i, m("slab", { color: "#f59a6c", outline: "taper", surface: "flaky", fat: "#fde3d2", cookedColor: "#f4b392" })],
  [/\b(cod|haddock|white fish|halibut)\b/i, m("slab", { color: "#f4ede4", outline: "taper", surface: "flaky", fat: "#d9cfc2", seed: 2 })],
  [/\btofu\b/i, m("slab", { color: "#f7f1e1", outline: "block", cookedColor: "#e8b770" })],
];

/** How mise draws this ingredient, or null when mise has no form for it yet. */
export function miseFor(ing: Ingredient): MiseMatch | null {
  return CATALOG.find(([re]) => re.test(ing.name))?.[1] ?? null;
}

const WORDS: [RegExp, Cut][] = [
  [/\b(strips?|julienne|matchsticks?|shred(ded)?)\b/i, "strips"],
  [/\bwedges?\b/i, "wedges"],
  [/\brings?\b/i, "rings"],
  [/\bhalve[sd]?\b|\bin half\b/i, "halved"],
  [/\bmince[sd]?\b|\bfinely chop/i, "minced"],
  [/\bdice[sd]?\b|\bcubes?\b/i, "diced"],
  [/\bslice[sd]?\b|\bcoins?\b/i, "sliced"],
];

const BY_TECHNIQUE: Partial<Record<Technique, Cut>> = { chop: "diced", mince: "minced", slice: "sliced" };

/**
 * The cut a step asks for. The sentence that names the ingredient wins over the technique, so "Cut the carrot into
 * strips" gives strips even in a chop step. A chopped scallion is cut into rings, which is how it is always chopped.
 */
export function cutFor(ing: Ingredient, technique: Technique, text: string, match: MiseMatch | null): Cut {
  const key = ing.name.split(/[\s,]+/).filter((w) => w.length > 2).pop() ?? ing.name;
  const stem = key.replace(/(es|s)$/i, "");
  const sentence = text.split(/(?<=[.;])\s+/).find((s) => s.toLowerCase().includes(stem.toLowerCase())) ?? text;
  // The last cut named is the one the ingredient ends up in: "into strips, then small dice" is diced.
  let last: { at: number; cut: Cut } | null = null;
  for (const [re, cut] of WORDS) {
    const g = new RegExp(re.source, "gi");
    for (const hit of sentence.matchAll(g)) if (!last || hit.index > last.at) last = { at: hit.index, cut };
  }
  if (last) return last.cut;
  if (match?.form === "stalk" && technique === "chop") return "rings";
  return BY_TECHNIQUE[technique] ?? "diced";
}

/** At this scale a 44 cm board fills the 300-unit counter: the scale the knife and board are drawn at. */
export const BOARD_PX_PER_CM = 6.8;
/**
 * The board's scale for one step: as close as possible while the biggest of these drawings still fits `room` stage
 * units, so a garlic clove is readable and a scallion fits. Everything drawn at it keeps its true size relative to the rest.
 */
export function boardScale(foods: { match: MiseMatch; cut: Cut }[], room: number): number {
  if (foods.length === 0) return BOARD_PX_PER_CM;
  const cm = Math.max(...foods.map(({ match, cut }) => boxCm(match.form, { ...match.props, cut } as never)));
  return Math.min(15, Math.max(3, room / cm));
}

/** Box size in stage units for this drawing at `pxPerCm`. */
export function miseSize(match: MiseMatch, cut: Cut, pxPerCm: number, layout: Layout = "pile", cooked = false): number {
  return boxCm(match.form, { ...match.props, cut, layout, cooked } as never) * pxPerCm;
}

const DRAW: { [F in BoardForm]: (p: FormProps[F]) => React.ReactElement } = {
  slab: (p) => <Slab {...p} />,
  bulb: (p) => <Bulb {...p} />,
  clove: (p) => <Clove {...p} />,
  knob: (p) => <Knob {...p} />,
  stalk: (p) => <Stalk {...p} />,
  round: (p) => <Round {...p} />,
  root: (p) => <Root {...p} />,
  floret: (p) => <Floret {...p} />,
  leaf: (p) => <Leaf {...p} />,
  egg: (p) => <Egg {...p} />,
  curl: (p) => <Curl {...p} />,
  strand: (p) => <Strand {...p} />,
  pepper: (p) => <Pepper {...p} />,
  cap: (p) => <Cap {...p} />,
};

/** A mise drawing centred on (x, y) at the board's real scale. Untitled: the stage's own label names the step. */
export function MiseArt({
  match,
  cut,
  x,
  y,
  pxPerCm,
  layout = "pile",
  cooked,
  browning,
  max = Infinity,
}: {
  match: MiseMatch;
  cut: Cut;
  x: number;
  y: number;
  pxPerCm: number;
  layout?: Layout;
  cooked?: boolean;
  browning?: number;
  /** Largest box allowed, for food set aside at the edge of a zoomed-in board. */
  max?: number;
}) {
  /** Measured as drawn: cooked noodles heap smaller than the dry bundle they came from. */
  const size = Math.min(max, miseSize(match, cut, pxPerCm, layout, !!cooked));
  const draw = DRAW[match.form] as (p: object) => React.ReactElement;
  const props = { ...match.props, cut, layout, cooked, size, ...(browning != null ? { browning } : {}) };
  return <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)})`}>{draw(props)}</g>;
}
