import type { Ingredient, Technique } from "@/lib/recipe/types";
import { boxCm, CATALOG, Form, match, type Cut, type FormName, type FormProps, type IngredientId, type Layout } from "@/vendor/mise";

/** Forms that can be drawn on the board. Pool, Dust and Grain are poured or sprinkled by the vessels, never cut. */
type BoardForm = Exclude<FormName, "pool" | "dust" | "grain">;
const UNCUT: FormName[] = ["pool", "dust", "grain"];

export interface MiseMatch {
  id: IngredientId;
  form: BoardForm;
  props: FormProps[BoardForm];
}

/** How mise draws this ingredient, or null when mise has no drawing for it or it is poured or sprinkled. */
export function miseFor(ing: Ingredient): MiseMatch | null {
  const id = match(ing.name);
  if (!id) return null;
  const entry = CATALOG[id];
  if (UNCUT.includes(entry.form)) return null;
  return { id, form: entry.form as BoardForm, props: entry.props as FormProps[BoardForm] };
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
  const props = { ...match.props, cut, layout, cooked, size, ...(browning != null ? { browning } : {}) };
  return (
    <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)})`}>
      <Form form={match.form} {...(props as FormProps[BoardForm])} />
    </g>
  );
}
