import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import type { KnobShape } from "./knob-shape";

/** What cooks actually do with ginger: slices are coins, strips are matchsticks, and wedges become grated. */
export type KnobCut = "halved" | "coins" | "matchsticks" | "diced" | "minced" | "grated";

export const KNOB_CUT: Record<Exclude<Cut, "whole">, KnobCut> = {
  halved: "halved",
  sliced: "coins",
  rings: "coins",
  strips: "matchsticks",
  diced: "diced",
  minced: "minced",
  wedges: "grated",
};

export interface KnobPiece {
  outer: Pt[];
  thick: number;
  /** The cut face keeps a thin band of skin round its edge. */
  rim: boolean;
  /** A faint line inside the face, where the fibrous core meets the outer flesh. */
  core?: Pt[];
  /** Fibres along the face, as open lines. */
  fibres?: Pt[][];
  /** Fibres seen end-on across a coin, as dots. */
  specks?: Pt[];
  /** The side shows skin rather than flesh. */
  skinSide: boolean;
}

/** Grated root: a wet, stringy mound sitting in its own juice. */
export interface Grated {
  mound: Pt[];
  juice: Pt[];
  strands: Pt[][];
}

export interface KnobCutResult {
  pieces: KnobPiece[];
  heap: boolean;
  grated?: Grated;
}

/** How long and wide a split finger is, and how big a coin, for each kind of root. */
const SIZE: Record<KnobShape, { length: number; width: number; coin: number }> = {
  hand: { length: 44, width: 18, coin: 8 },
  finger: { length: 46, width: 11, coin: 5.5 },
  stout: { length: 44, width: 15, coin: 7.5 },
};

function moved(shape: Omit<KnobPiece, "thick" | "rim" | "skinSide">, rot: number, x: number, y: number, squash = 0.8) {
  const [cx, cy] = centroid(shape.outer);
  const go = (p: Pt[]) => layFlat(p.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return {
    outer: go(shape.outer),
    core: shape.core && go(shape.core),
    fibres: shape.fibres?.map(go),
    specks: shape.specks && go(shape.specks),
  };
}

/** A finger split lengthwise: long and lumpy, pinched at a joint, with fibres running its length. */
function half(length: number, width: number, seed: number) {
  const rand = rng(seed * 31 + 7);
  const joint = (rand() * 2 - 1) * length * 0.18;
  const [p1, p2] = [rand() * 6.28, rand() * 6.28];
  /** Where a side branch was broken off, leaving a nub on one edge. */
  const nub = joint + (rand() > 0.5 ? 1 : -1) * length * (0.14 + rand() * 0.08);
  const outline = (inset: number): Pt[] =>
    Array.from({ length: 22 }, (_, i) => {
      const t = (i / 22) * Math.PI * 2;
      const c = Math.cos(t);
      const x = Math.sign(c) * Math.abs(c) ** 0.75 * (length / 2) * inset;
      const pinch = 1 - 0.2 * Math.exp(-(((x - joint) / 4) ** 2));
      const knob = Math.sin(t) < 0 ? 1 + 0.38 * Math.exp(-(((x - nub) / (length * 0.09)) ** 2)) : 1;
      const bumps = 1 + 0.06 * Math.sin(3 * t + p1) + 0.04 * Math.sin(5 * t + p2);
      return [x, Math.sin(t) * (width / 2) * inset * pinch * knob * bumps * (1 - 0.12 * c)];
    });
  const outer = sampleClosed(outline(1), 3);
  const core = sampleClosed(outline(0.68), 3);
  const fibres = [-0.4, -0.12, 0.16, 0.42].map((s) => {
    const y = s * width * 0.55;
    const [from, to] = [-0.4 + rand() * 0.12, 0.38 - rand() * 0.12];
    return Array.from({ length: 7 }, (_, i): Pt => {
      const a = from + ((to - from) * i) / 6;
      return [a * length, y * (1 - 0.12 * a) + Math.sin(a * 9 + s * 5) * 0.5 + (rand() * 2 - 1) * 0.3];
    });
  });
  return { outer, core, fibres };
}

function coin(r: number, seed: number) {
  const rand = rng(seed * 13 + 3);
  const pts = ring(0, 0, r, r * (0.84 + rand() * 0.14), seed, 0.07, 10);
  const outer = sampleClosed(pts, 3);
  const core = sampleClosed(pts.map(([x, y]): Pt => [x * 0.66 + r * 0.04, y * 0.66]), 3);
  /** Fibres seen end-on gather in a dotted ring just inside the core line, with a few scattered within. */
  const specks = Array.from({ length: 22 }, (_, i): Pt => {
    const a = rand() * Math.PI * 2;
    const d = i < 16 ? r * (0.5 + rand() * 0.12) : Math.sqrt(rand()) * r * 0.4;
    return [Math.cos(a) * d + r * 0.03, Math.sin(a) * d * 0.9];
  });
  return { outer, core, specks };
}

function stick(length: number, width: number, seed: number) {
  const rand = rng(seed * 17 + 1);
  const j = () => (rand() * 2 - 1) * 0.25;
  const [l, w] = [length / 2, width / 2];
  const outer: Pt[] = [
    [-l + j(), -w + j() * 0.4],
    [l + j(), -w + j() * 0.4],
    [l + j(), w + j() * 0.4],
    [-l + j(), w + j() * 0.4],
  ];
  return { outer, fibres: [[[-l * 0.8, 0], [l * 0.8, (rand() * 2 - 1) * 0.3]] as Pt[]] };
}

function grated(seed: number): Grated {
  const rand = rng(seed * 47 + 11);
  const mound = ring(0, -3, 19, 12, seed + 4, 0.1, 14);
  const juice = ring(3, 3, 26, 13, seed + 8, 0.08, 10);
  /** Some strands reach past the mound's edge, so it reads as a soft heap of shreds rather than a lump. */
  const strands = Array.from({ length: 160 }, (): Pt[] => {
    const a = rand() * Math.PI * 2;
    const d = Math.min(1.06, Math.sqrt(rand()) * 1.08);
    const [x, y] = [Math.cos(a) * d * 18, -3 + Math.sin(a) * d * 11];
    const dir = rand() * Math.PI;
    const len = 2 + rand() * 3.5;
    const bend = (rand() * 2 - 1) * 1.2;
    const [dx, dy] = [Math.cos(dir) * len, Math.sin(dir) * len * 0.8];
    return [
      [x - dx / 2, y - dy / 2],
      [x - dy * 0.15 * bend, y + dx * 0.15 * bend],
      [x + dx / 2, y + dy / 2],
    ];
  });
  return { mound, juice, strands };
}

export function cutKnob(shape: KnobShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean): KnobCutResult {
  const rand = rng(seed * 37 + 5);
  const wob = () => rand() * 2 - 1;
  const size = SIZE[shape];

  switch (KNOB_CUT[cut]) {
    case "halved": {
      const h = half(size.length, size.width, seed);
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [x, -y]);
      const other = { outer: mirror(h.outer), core: mirror(h.core), fibres: h.fibres.map(mirror) };
      const gap = size.width * 0.75;
      return {
        heap: false,
        pieces: [
          { ...moved(h, -0.12 + wob() * 0.06, -2, -gap), thick: size.width * 0.32, rim: !peeled, skinSide: !peeled },
          { ...moved(other, -0.08 + wob() * 0.06, 3, gap), thick: size.width * 0.32, rim: !peeled, skinSide: !peeled },
        ],
      };
    }
    case "coins": {
      const row = Array.from({ length: 7 }, (_, i) => ({
        ...moved(coin(size.coin * (0.9 + Math.sin(((i + 0.5) / 7) * Math.PI) * 0.15), seed + i), wob() * 0.3, -27 + i * size.coin * 1.05, -8 + wob()),
        thick: 1.6,
        rim: !peeled,
        skinSide: !peeled,
      }));
      const loose = Array.from({ length: 4 }, (_, i) => ({
        ...moved(coin(size.coin * (0.8 + rand() * 0.25), seed + 20 + i), rand() * 6.28, -20 + i * 14 + wob() * 3, 12 + wob() * 3),
        thick: 1.6,
        rim: !peeled,
        skinSide: !peeled,
      }));
      return { heap: false, pieces: [...row, ...loose] };
    }
    case "matchsticks": {
      const pieces = Array.from({ length: 20 }, (_, i) => {
        const a = i * 2.39996;
        const rad = Math.sqrt((i + 0.5) / 20);
        return {
          ...moved(stick(18 + rand() * 7, 2.3 + rand() * 0.5, seed + i), 0.25 + wob() * 0.35, Math.cos(a) * 14 * rad, Math.sin(a) * 11 * rad),
          thick: 1.5,
          rim: false,
          skinSide: false,
        };
      });
      return { heap: true, pieces };
    }
    case "diced":
    case "minced": {
      const fine = KNOB_CUT[cut] === "minced";
      const count = fine ? 120 : 46;
      const pieces = Array.from({ length: count }, (_, i) => {
        const a = i * 2.39996;
        const rad = Math.sqrt((i + 0.5) / count);
        const s = fine ? 1.1 + rand() * 0.6 : 3 + rand() * 1.2;
        const outer = fine
          ? sampleClosed(ring(0, 0, s, s * (0.6 + rand() * 0.4), seed + i * 3, 0.35, 5), 2)
          : stick(s, s * (0.85 + rand() * 0.2), seed + i * 3).outer;
        const spread = fine ? [19, 12] : [25, 16];
        return {
          ...moved({ outer }, rand() * 6.28, Math.cos(a) * spread[0]! * rad, Math.sin(a) * spread[1]! * rad - (1 - rad) * 3),
          thick: fine ? 1 : 2.4,
          rim: false,
          skinSide: false,
        };
      });
      return { heap: true, pieces };
    }
    case "grated":
      return { heap: true, pieces: [], grated: grated(seed) };
  }
}

/** The piece a scene would scatter: the biggest one, a small cluster of mince, or the grated mound itself. */
export function representativeKnob(result: KnobCutResult, cut: Exclude<Cut, "whole">): KnobPiece[] {
  if (result.grated) return [];
  const area = (p: KnobPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  if (KNOB_CUT[cut] === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: KnobPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 10);
  }
  return [result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a))];
}

/** Cooked pieces dry out and shrink a little. */
export function shrinkKnob(p: KnobPiece): KnobPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.92, cy + (y - cy) * 0.92]);
  return { ...p, outer: s(p.outer), core: p.core && s(p.core), fibres: p.fibres?.map(s), specks: p.specks && s(p.specks), thick: p.thick * 0.8 };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameKnob(shape: KnobShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean, layout: Layout, cooked: boolean) {
  const result = cutKnob(shape, cut, seed, peeled);
  const picked = layout === "piece" ? representativeKnob(result, cut) : result.pieces;
  const gr = result.grated;
  return { result, ...frameCut(cooked ? picked.map(shrinkKnob) : picked, layout === "piece" && !gr ? 6 : 1.5, gr ? [...gr.juice, ...gr.mound] : []) };
}
