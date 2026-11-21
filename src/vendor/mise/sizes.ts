import type { Cut, Layout } from "./core/cut";
import { calipers, median } from "./core/frame";
import { bbox } from "./core/geometry";
import type { Pt } from "./core/rough";
import { BULB_CUT, frameBulb } from "./forms/bulb-cuts";
import { bulbGeometry, type BulbProps, type BulbShape } from "./forms/bulb-shape";
import { frameGarlic, GARLIC_CUT } from "./forms/clove-cuts";
import { cloveGeometry, headGeometry, type ClovePart, type CloveProps } from "./forms/clove-shape";
import { dustGeometry, type DustProps, type DustShape } from "./forms/dust-shape";
import { grainGeometry, type GrainProps, type GrainShape } from "./forms/grain-shape";
import { frameKnob, KNOB_CUT } from "./forms/knob-cuts";
import { knobGeometry, type KnobProps, type KnobShape } from "./forms/knob-shape";
import { poolGeometry, type PoolProps, type PoolShape } from "./forms/pool-shape";
import { frameRound, roundCut } from "./forms/round-cuts";
import { roundGeometry, type RoundProps, type RoundShape } from "./forms/round-shape";
import { frameRoot, ROOT_CUT } from "./forms/root-cuts";
import { FLORET_CUT, frameFloret } from "./forms/floret-cuts";
import { floretGeometry, type FloretProps, type FloretShape } from "./forms/floret-shape";
import { rootGeometry, type RootProps, type RootShape } from "./forms/root-shape";
import { frameLeaf, LEAF_CUT } from "./forms/leaf-cuts";
import { eggCut, frameEgg } from "./forms/egg-cuts";
import { beatenGeometry, crackedGeometry, omeletteGeometry, shellGeometry, type EggProps, type EggState } from "./forms/egg-shape";
import { leafGeometry, type LeafProps, type LeafShape } from "./forms/leaf-shape";
import { frameSlab, outlinePolygon, type SlabOutline, type SlabProps } from "./forms/slab-shape";
import { frameStalk, STALK_CUT } from "./forms/stalk-cuts";
import { stalkGeometry, type StalkProps, type StalkShape } from "./forms/stalk-shape";

/**
 * How big food really is, so a cherry tomato never draws as big as a cabbage in one scene. mise knows the centimetres;
 * the app decides how many pixels a centimetre is in each scene and passes `size = boxCm(form, props) × pxPerCm`.
 * This is plain data, to move into the catalog later.
 */

/** A food's real dimensions, in centimetres. */
export interface RealSize {
  /** Its width as drawn: across a tomato or an onion, end to end on a ginger root or a scallion lying down. */
  wide: number;
  /** Its longest dimension, when that is not the width as drawn: a garlic clove standing up is 1.6 wide, 2.8 long. */
  long?: number;
  /** Across a slice of it: a lemon wheel, a scallion ring, a ginger coin. */
  across?: number;
}

/** Real sizes of each form's variants. A catalog entry overrides `wide` with `realSize`, and the rest scale with it. */
export const REAL_SIZE = {
  slab: {
    /** A chicken thigh or breast. */
    organic: { wide: 14 },
    /** A steak or a pork chop. */
    oval: { wide: 16 },
    /** A fish fillet. */
    taper: { wide: 18 },
    /** A block of tofu. */
    block: { wide: 10 },
  } satisfies Record<SlabOutline, RealSize>,
  bulb: {
    round: { wide: 8 },
    /** A red onion. */
    squat: { wide: 9 },
    /** A shallot, standing up: 3.5 across, 5 tall. */
    long: { wide: 3.5, long: 5 },
  } satisfies Record<BulbShape, RealSize>,
  clove: {
    head: { wide: 6 },
    clove: { wide: 1.6, long: 2.8, across: 1.6 },
  } satisfies Record<ClovePart, RealSize>,
  knob: {
    /** Ginger. */
    hand: { wide: 10, across: 2.5 },
    /** Turmeric. */
    finger: { wide: 7, across: 1.5 },
    /** Galangal. */
    stout: { wide: 9, across: 3 },
  } satisfies Record<KnobShape, RealSize>,
  stalk: {
    scallion: { wide: 35, across: 1 },
    leek: { wide: 35, across: 3.5 },
    celery: { wide: 30, across: 2.5 },
    lemongrass: { wide: 30, across: 1.5 },
  } satisfies Record<StalkShape, RealSize>,
  round: {
    tomato: { wide: 7 },
    citrus: { wide: 8 },
    /** Lying on its side: 8 long, 5.5 across. */
    lemon: { wide: 8, across: 5.5 },
    apple: { wide: 8 },
  } satisfies Record<RoundShape, RealSize>,
  root: {
    /** A medium carrot lying down, 18 long and 2.5 across at the shoulder. */
    carrot: { wide: 18, across: 2.5 },
    /** A daikon, 30 long and 6 across. */
    daikon: { wide: 30, across: 6 },
    /** A baking potato lying on its side, 10 long and 6.5 across. */
    potato: { wide: 10, across: 6.5 },
  } satisfies Record<RootShape, RealSize>,
  floret: {
    /** A head of broccoli lying on its side, stalk and all. */
    broccoli: { wide: 16, across: 12 },
    cauliflower: { wide: 16, across: 15 },
  } satisfies Record<FloretShape, RealSize>,
  leaf: {
    /** A handful of cilantro sprigs, stems to leaves. */
    cilantro: { wide: 20 },
    /** A basil sprig. */
    basil: { wide: 14 },
    /** A bunch of spinach. */
    spinach: { wide: 25 },
    /** A head of bok choy lying down, 20 long and 7 across at the stalks. */
    bokchoy: { wide: 20, across: 7 },
    cabbage: { wide: 16, across: 16 },
  } satisfies Record<LeafShape, RealSize>,
  egg: {
    /** A large hen's egg lying on its side, 5.7 long and 4.4 across. */
    shell: { wide: 5.7, across: 4.4 },
    boiled: { wide: 5.7, across: 4.4 },
    /** A cracked egg spread on a pan: a fried egg is about 11 cm across. */
    cracked: { wide: 11 },
    /** Two beaten eggs poured out; cooked whole, a folded omelette is wider still. */
    beaten: { wide: 10, long: 15 },
  } satisfies Record<EggState, RealSize>,
  /** How wide a pour spreads on the counter (about two tablespoons), and one drop. */
  pool: {
    thin: { wide: 10, drop: 0.8 },
    oil: { wide: 8, drop: 0.8 },
    syrup: { wide: 5, drop: 1.5 },
    creamy: { wide: 7, drop: 1.2 },
    sauce: { wide: 7, drop: 1.2 },
  } satisfies Record<PoolShape, { wide: number; drop: number }>,
  /** How wide a heap is (about a tablespoon), and a pinch scattered on the counter. */
  dust: {
    powder: { wide: 5, pinch: 1.5 },
    crystal: { wide: 5, pinch: 1.5 },
    sugar: { wide: 5, pinch: 1.5 },
    flakes: { wide: 5, pinch: 2 },
    cracked: { wide: 4, pinch: 1.5 },
  } satisfies Record<DustShape, { wide: number; pinch: number }>,
  /** The length of one grain: grains are drawn at their own size, so a heap is as big as its grains make it. */
  grain: {
    rice: { grain: 0.7 },
    lentil: { grain: 0.45 },
    /** Sesame. */
    seed: { grain: 0.3 },
    /** A corn kernel. */
    kernel: { grain: 0.9 },
  } satisfies Record<GrainShape, { grain: number }>,
};

/** A real size to match, and whether it is a piece's length (`long`) or how wide it is across (`across`). */
export interface PieceSize {
  cm: number;
  by: "long" | "across";
}

/** The usual knife sizes, whatever the food: dice about 1 cm, mince about 3 mm. Small food is never cut bigger than half itself. */
export const KNIFE_CM = { diced: 1, minced: 0.3, matchstick: 0.3, shred: 0.2 };

type Dims = Required<RealSize>;
const dims = (r: RealSize, realSize?: number): Dims => {
  const k = realSize ? realSize / r.wide : 1;
  return { wide: r.wide * k, long: (r.long ?? r.wide) * k, across: (r.across ?? r.wide) * k };
};
const knife = (cm: number, d: Dims): PieceSize => ({ cm: Math.min(cm, d.across * 0.5), by: "across" });

/** The real size of a typical piece for each cut each form draws. */
export const PIECE_SIZE = {
  bulb: (cut: Exclude<Cut, "whole">, d: Dims): PieceSize =>
    ({
      halved: { cm: d.wide, by: "long" },
      rings: { cm: d.across, by: "long" },
      sliced: { cm: d.across * 0.8, by: "long" },
      wedges: { cm: d.across * 0.5, by: "long" },
      diced: knife(KNIFE_CM.diced, d),
      minced: knife(KNIFE_CM.minced, d),
    })[BULB_CUT[cut]] as PieceSize,
  clove: (cut: Exclude<Cut, "whole">, d: Dims, head: Dims): PieceSize =>
    ({
      halved: { cm: d === head ? head.wide : d.long, by: "long" },
      sliced: { cm: d.across, by: "long" },
      diced: knife(0.4, d),
      minced: knife(0.15, d),
      smashed: { cm: d.long, by: "long" },
    })[GARLIC_CUT[cut]] as PieceSize,
  knob: (cut: Exclude<Cut, "whole">, d: Dims): PieceSize =>
    ({
      halved: { cm: d.across, by: "across" },
      coins: { cm: d.across, by: "long" },
      matchsticks: { cm: KNIFE_CM.matchstick, by: "across" },
      diced: knife(0.5, d),
      minced: knife(0.2, d),
      grated: { cm: 4, by: "long" },
    })[KNOB_CUT[cut]] as PieceSize,
  stalk: (cut: Exclude<Cut, "whole">, d: Dims): PieceSize =>
    ({
      halved: { cm: d.across, by: "across" },
      rings: { cm: d.across, by: "long" },
      bias: { cm: d.across * 1.4, by: "long" },
      shreds: { cm: KNIFE_CM.shred, by: "across" },
      lengths: { cm: d.across, by: "across" },
      diced: { cm: d.across, by: "long" },
      minced: knife(KNIFE_CM.minced, d),
    })[STALK_CUT[cut]] as PieceSize,
  round: (cut: Exclude<Cut, "whole">, d: Dims, shape: RoundShape): PieceSize => {
    const citrus = shape === "citrus" || shape === "lemon";
    switch (roundCut(shape, cut)) {
      case "halved":
        return { cm: shape === "apple" ? d.wide : d.across, by: "long" };
      case "sliced":
        return { cm: shape === "apple" ? d.wide * 0.85 : d.across * 0.9, by: "long" };
      case "rings":
        return { cm: d.across, by: "long" };
      case "wedges":
        return { cm: shape === "apple" ? d.wide * 0.8 : citrus ? d.wide : d.across, by: "long" };
      case "diced":
        return citrus ? { cm: d.across * 0.5, by: "long" } : knife(KNIFE_CM.diced, d);
      case "minced":
        return citrus ? { cm: 0.5, by: "long" } : knife(KNIFE_CM.minced, d);
      case "strips":
        return { cm: shape === "apple" ? 5 : d.across * (shape === "tomato" ? 0.7 : 0.6), by: "long" };
    }
    return { cm: d.across, by: "long" };
  },
  root: (cut: Exclude<Cut, "whole">, d: Dims, shape: RootShape): PieceSize =>
    ({
      halved: { cm: d.wide, by: "long" },
      coins: { cm: d.across, by: "long" },
      /** Matchsticks for carrot and daikon, 1 cm batons for potato. */
      sticks: { cm: shape === "potato" ? 1 : KNIFE_CM.matchstick, by: "across" },
      diced: knife(KNIFE_CM.diced, d),
      minced: knife(KNIFE_CM.minced, d),
      /** A carrot roll-cut is about as long as the carrot is wide; a potato wedge runs the potato's length; a half-moon is the daikon's width. */
      chunks: { cm: shape === "potato" ? d.wide * 0.85 : shape === "carrot" ? d.across * 1.4 : d.across, by: "long" },
    })[ROOT_CUT[cut]] as PieceSize,
  floret: (cut: Exclude<Cut, "whole">, d: Dims): PieceSize =>
    ({
      halved: { cm: d.across, by: "long" },
      steaks: { cm: d.across * 0.85, by: "long" },
      /** Florets are broken off by hand: a large one about 5 cm, a bite-size one about 3. */
      florets: { cm: 5, by: "long" },
      bites: { cm: 3, by: "long" },
      riced: { cm: KNIFE_CM.minced, by: "across" },
      batons: { cm: 0.8, by: "across" },
      coins: { cm: 3, by: "long" },
    })[FLORET_CUT[cut]] as PieceSize,
  egg: (cut: Exclude<Cut, "whole">, d: Dims, state: EggState): PieceSize => {
    switch (eggCut(state, cut)) {
      case "halves":
      case "quarters":
        return { cm: d.wide, by: "long" };
      case "slices":
        return { cm: d.across, by: "long" };
      case "chopped":
        return { cm: 0.8, by: "long" };
      case "grated":
        return { cm: KNIFE_CM.minced, by: "long" };
      /** Scrambled curds about 3 cm; omelette ribbons 5 mm wide; fried-rice bits 5 mm. */
      case "curds":
        return { cm: 3, by: "long" };
      case "ribbons":
        return { cm: 0.5, by: "across" };
      default:
        return { cm: 0.5, by: "long" };
    }
  },
  leaf: (cut: Exclude<Cut, "whole">, d: Dims, shape: LeafShape): PieceSize => {
    const herb = shape === "cilantro" || shape === "basil";
    switch (LEAF_CUT[shape][cut]) {
      case "halved":
        return { cm: d.wide, by: "long" };
      case "wedges":
        return { cm: shape === "cabbage" ? d.wide * 0.5 : d.wide, by: "long" };
      /** One leaf: a cilantro leaflet with its bit of stem, a basil or spinach leaf, a whole bok choy stalk. */
      case "leaves":
        return { cm: shape === "cilantro" ? 3 : shape === "basil" ? 5 : shape === "spinach" ? 12 : d.wide, by: "long" };
      case "ribbons":
        return { cm: shape === "spinach" ? 0.8 : KNIFE_CM.shred * 1.5, by: "across" };
      case "torn":
        return { cm: herb ? 1.2 : shape === "spinach" ? 4 : 2.5, by: "long" };
      case "chopped":
        return { cm: herb ? 0.5 : shape === "bokchoy" ? 1.2 : 2, by: "long" };
      case "minced":
        return { cm: KNIFE_CM.minced, by: "across" };
    }
  },
};

export type FormName = "slab" | "bulb" | "clove" | "knob" | "stalk" | "pool" | "dust" | "grain" | "round" | "root" | "floret" | "leaf" | "egg";
export interface FormProps {
  slab: SlabProps;
  bulb: BulbProps;
  clove: CloveProps;
  knob: KnobProps;
  stalk: StalkProps;
  pool: PoolProps;
  dust: DustProps;
  grain: GrainProps;
  round: RoundProps;
  root: RootProps;
  floret: FloretProps;
  leaf: LeafProps;
  egg: EggProps;
}

/** What the box holds, measured from the geometry: the zoom it is drawn at, and the sizes (in box units, before that zoom) to match to real ones. */
export interface Measured {
  k: number;
  sizes: number[];
  real: PieceSize;
  /** The outlines measured, in box units before the zoom: the pieces of a cut, or the whole food. */
  outlines: Pt[][];
}

const widthOf = (pts: Pt[]) => bbox(pts).w;
const sized = (pieces: Pt[][], by: PieceSize["by"]) => pieces.map((p) => calipers(p)[by]);
/** A cut's measurement: the zoom from the food as drawn, the sizes from the raw pieces. */
const cutOf = (k: number, raw: Pt[][], real: PieceSize): Measured => ({ k, sizes: sized(raw, real.by), real, outlines: raw });
/** A whole food, or a pour, heap or grain, drawn straight into the box. */
const wholeOf = (outline: Pt[], cm: number, k = 1): Measured => ({ k, sizes: [widthOf(outline)], real: { cm, by: "long" }, outlines: [outline] });

/**
 * Measures a drawing: what real size it shows and how big that is in the box. Sizes are measured on the raw food and
 * the zoom on the food as drawn, so cooking's own shrinking, slumping and swelling still show at a true scale.
 */
export function measure<F extends FormName>(form: F, props: FormProps[F]): Measured {
  const p = props as FormProps[FormName] & { cut?: Cut; layout?: Layout; seed?: number; cooked?: boolean; realSize?: number };
  const cut = p.cut ?? "whole";
  const layout = p.layout ?? "pile";
  const seed = p.seed ?? 1;
  const cooked = !!p.cooked;

  switch (form) {
    case "slab": {
      /** Slab pieces are cut from the real outline, so every cut keeps the whole slab's scale. */
      const q = p as SlabProps;
      const outline = q.outline ?? "organic";
      const frame = frameSlab(outline, cut, seed, layout, cooked);
      return { ...wholeOf(outlinePolygon(outline, seed), p.realSize ?? REAL_SIZE.slab[outline].wide, frame.k), outlines: frameSlab(outline, cut, seed, layout, false).pieces.map((x) => x.pts) };
    }
    case "bulb": {
      const q = p as BulbProps;
      const shape = q.shape ?? "round";
      const d = dims(REAL_SIZE.bulb[shape], p.realSize);
      /** Cooked onion is drawn peeled. */
      const peeled = !!q.peeled || cooked;
      if (cut === "whole") return wholeOf(bulbGeometry(shape, seed, peeled).pts, d.wide);
      return cutOf(frameBulb(shape, cut, seed, peeled, layout, cooked).k, frameBulb(shape, cut, seed, peeled, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.bulb(cut, d));
    }
    case "clove": {
      const q = p as CloveProps;
      const part = q.part ?? "clove";
      const head = dims(REAL_SIZE.clove.head, part === "head" ? p.realSize : undefined);
      const clove = dims(REAL_SIZE.clove.clove, part === "clove" ? p.realSize : undefined);
      if (cut === "whole") return wholeOf((part === "head" ? headGeometry(seed) : cloveGeometry(seed)).pts, part === "head" ? head.wide : clove.wide);
      /** Cooked garlic is drawn peeled, unless it is a head roasted whole or halved in its skin. */
      const peeled = !!q.peeled || (cooked && !(part === "head" && cut === "halved"));
      const d = part === "head" && GARLIC_CUT[cut] === "halved" ? head : clove;
      const raw = frameGarlic(part, cut, seed, peeled, layout, false);
      return cutOf(frameGarlic(part, cut, seed, peeled, layout, cooked).k, raw.pieces.map((x) => x.outer), PIECE_SIZE.clove(cut, d, head));
    }
    case "knob": {
      const q = p as KnobProps;
      const shape = q.shape ?? "hand";
      const d = dims(REAL_SIZE.knob[shape], p.realSize);
      if (cut === "whole") {
        const ends = knobGeometry(shape, seed).segments.flatMap((s) => {
          const [nx, ny] = [-s.dir[1] * s.width * 0.5, s.dir[0] * s.width * 0.5];
          return [s.start, s.end].flatMap(([x, y]): Pt[] => [[x + nx, y + ny], [x - nx, y - ny]]);
        });
        return wholeOf(ends, d.wide);
      }
      const raw = frameKnob(shape, cut, seed, !!q.peeled, layout, false);
      const pieces = raw.result.grated ? [raw.result.grated.mound] : raw.pieces.map((x) => x.outer);
      return cutOf(frameKnob(shape, cut, seed, !!q.peeled, layout, cooked).k, pieces, PIECE_SIZE.knob(cut, d));
    }
    case "stalk": {
      const q = p as StalkProps;
      const shape = q.shape ?? "scallion";
      const d = dims(REAL_SIZE.stalk[shape], p.realSize);
      if (cut === "whole") {
        const g = stalkGeometry(shape, seed);
        return wholeOf([...g.tubes.flatMap((t) => t.outline), ...g.leaflets.flatMap((l) => l.outline)], d.wide);
      }
      return cutOf(frameStalk(shape, cut, seed, layout, cooked).k, frameStalk(shape, cut, seed, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.stalk(cut, d));
    }
    case "round": {
      const shape = (p as RoundProps).shape ?? "tomato";
      const d = dims(REAL_SIZE.round[shape], p.realSize);
      if (cut === "whole") return wholeOf(roundGeometry(shape, seed).pts, d.wide);
      return cutOf(frameRound(shape, cut, seed, layout, cooked).k, frameRound(shape, cut, seed, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.round(cut, d, shape));
    }
    case "root": {
      const q = p as RootProps;
      const shape = q.shape ?? "carrot";
      const d = dims(REAL_SIZE.root[shape], p.realSize);
      if (cut === "whole") return wholeOf(rootGeometry(shape, seed).outline, d.wide);
      return cutOf(frameRoot(shape, cut, seed, !!q.peeled, layout, cooked).k, frameRoot(shape, cut, seed, !!q.peeled, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.root(cut, d, shape));
    }
    case "floret": {
      const shape = (p as FloretProps).shape ?? "broccoli";
      const d = dims(REAL_SIZE.floret[shape], p.realSize);
      if (cut === "whole") {
        const g = floretGeometry(shape, seed);
        return wholeOf([...g.lobes.flatMap((l) => l.outline), ...g.stalk, ...g.leavesBack.flatMap((l) => l.outline), ...g.leavesFront.flatMap((l) => l.outline)], d.wide);
      }
      return cutOf(frameFloret(shape, cut, seed, layout, cooked).k, frameFloret(shape, cut, seed, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.floret(cut, d));
    }
    case "leaf": {
      const shape = (p as LeafProps).shape ?? "cilantro";
      const d = dims(REAL_SIZE.leaf[shape], p.realSize);
      if (cut === "whole") return wholeOf(leafGeometry(shape, seed).flatMap((x) => x.outer), d.wide);
      return cutOf(frameLeaf(shape, cut, seed, layout, cooked).k, frameLeaf(shape, cut, seed, layout, false).pieces.map((x) => x.outer), PIECE_SIZE.leaf(cut, d, shape));
    }
    case "egg": {
      const q = p as EggProps;
      const state = q.state ?? "shell";
      const d = dims(REAL_SIZE.egg[state], p.realSize);
      if (cut === "whole" || state === "cracked") {
        if (state === "cracked") return wholeOf(crackedGeometry(seed).white, d.wide);
        if (state === "beaten") return cooked ? wholeOf(omeletteGeometry(seed).outline, d.long) : wholeOf(beatenGeometry(seed).pool, d.wide);
        return wholeOf(shellGeometry(seed).outline, d.wide);
      }
      const f = frameEgg(state, cut, seed, layout, !!q.soft);
      return cutOf(f.k, f.pieces.map((x) => x.outer), PIECE_SIZE.egg(cut, d, state));
    }
    case "pool": {
      const shape = (p as PoolProps).shape ?? "thin";
      const r = REAL_SIZE.pool[shape];
      const cm = p.realSize ?? (layout === "piece" ? r.drop : r.wide);
      return wholeOf(poolGeometry(shape, seed, layout, 0).surface, cm);
    }
    case "dust": {
      const shape = (p as DustProps).shape ?? "powder";
      const r = REAL_SIZE.dust[shape];
      const g = dustGeometry(shape, seed, layout, 0);
      const pts = g.outline ?? g.spill.map((s) => s.at);
      return wholeOf(pts, p.realSize ?? (layout === "piece" ? r.pinch : r.wide));
    }
    case "grain": {
      const shape = (p as GrainProps).shape ?? "rice";
      const g = grainGeometry(shape, seed, layout, false);
      const grains = [...g.items, ...g.spill];
      return { k: 1, sizes: grains.map((it) => it.len), real: { cm: p.realSize ?? REAL_SIZE.grain[shape].grain, by: "long" }, outlines: grains.map((it) => [[it.at[0] - it.len / 2, it.at[1]], [it.at[0] + it.len / 2, it.at[1]]]) };
    }
  }
  throw new Error(`unknown form ${form}`);
}

/**
 * How many real centimetres the drawing's 100-unit box spans, for these props. Draw it at
 * `size = boxCm(form, props) × pxPerCm` and every food in a scene comes out at its true size relative to the rest.
 */
export function boxCm<F extends FormName>(form: F, props: FormProps[F]): number {
  const m = measure(form, props);
  return (100 * m.real.cm) / (median(m.sizes) * m.k);
}
