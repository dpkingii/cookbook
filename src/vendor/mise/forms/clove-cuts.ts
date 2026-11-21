import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { cloveGeometry, type ClovePart } from "./clove-shape";

/** What garlic actually does with each cut: wedges become a smashed clove, strips and rings become slices. */
export type GarlicCut = "halved" | "sliced" | "diced" | "minced" | "smashed";

export const GARLIC_CUT: Record<Exclude<Cut, "whole">, GarlicCut> = {
  halved: "halved",
  sliced: "sliced",
  rings: "sliced",
  strips: "sliced",
  diced: "diced",
  minced: "minced",
  wedges: "smashed",
};

/** The cross-section of a head cut across: the papery outline, the cloves round it, and the stem in the middle. */
export interface Section {
  cloves: Pt[][];
  core: Pt[];
}

export interface GarlicPiece {
  outer: Pt[];
  thick: number;
  /** The pale green-gold germ down the middle of a clove, as a line. */
  germ?: Pt[];
  /** Cracks across a smashed clove. */
  cracks?: Pt[][];
  /** Torn skin lying beside a smashed clove. */
  skin?: Pt[][];
  section?: Section;
  /** The side shows papery skin rather than flesh. */
  skinSide: boolean;
}

export interface GarlicCutResult {
  pieces: GarlicPiece[];
  heap: boolean;
}

function moved(
  shape: { outer: Pt[]; germ?: Pt[]; cracks?: Pt[][]; skin?: Pt[][]; section?: Section },
  rot: number,
  x: number,
  y: number,
  squash = 0.8,
) {
  const [cx, cy] = centroid(shape.outer);
  const go = (p: Pt[]) => layFlat(p.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return {
    outer: go(shape.outer),
    germ: shape.germ && go(shape.germ),
    cracks: shape.cracks?.map(go),
    skin: shape.skin?.map(go),
    section: shape.section && { cloves: shape.section.cloves.map(go), core: go(shape.section.core) },
  };
}

/** A head cut across, seen from above: cloves arranged round the stem like petals. */
function headSection(seed: number): { outer: Pt[]; section: Section } {
  const rand = rng(seed * 29 + 1);
  const R = 28;
  const outer = sampleClosed(ring(0, 0, R, R * 0.96, seed, 0.04, 14), 4);
  const n = 8 + Math.floor(rand() * 3);
  const cloves = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand() * 0.12;
    const mid = R * (0.58 + rand() * 0.04);
    const radial = R * (0.29 + rand() * 0.03);
    const across = mid * Math.sin(Math.PI / n) * (1.02 + rand() * 0.06);
    const outline: Pt[] = Array.from({ length: 12 }, (_, j) => {
      const t = (j / 12) * Math.PI * 2;
      const x = Math.cos(t);
      const taper = x < 0 ? 1 + x * 0.55 : 1;
      return [x * radial, Math.sin(t) * across * taper];
    });
    const [c, sn] = [Math.cos(a), Math.sin(a)];
    return sampleClosed(
      outline.map(([x, y]): Pt => [Math.cos(a) * mid + x * c - y * sn, Math.sin(a) * mid + x * sn + y * c]),
      3,
    );
  });
  const core = sampleClosed(ring(0, 0, R * 0.15, R * 0.15, seed + 2, 0.1, 7), 3);
  return { outer, section: { cloves, core } };
}

/** One clove split lengthwise and laid flat, with its germ down the middle. */
function halfClove(seed: number) {
  const g = cloveGeometry(seed);
  const toLocal = (p: Pt[]) => p.map(([x, y]): Pt => [x - g.base[0], y - g.base[1]]);
  const outer = sampleClosed(toLocal(g.pts), 4);
  const [tx, ty] = [g.tip[0] - g.base[0], g.tip[1] - g.base[1]];
  const germ: Pt[] = [0.12, 0.35, 0.6, 0.86].map((t) => [tx * t - 1.5, ty * t]);
  return { outer, germ };
}

/** A thin slice across a clove: rounded on the back, flatter on the belly. */
function slice(seed: number, size: number) {
  const rand = rng(seed);
  const pts = ring(0, 0, size, size * 0.78, seed, 0.06, 9).map(([x, y]): Pt => [x, y > 0 ? y * 0.55 : y]);
  const outer = sampleClosed(pts, 3);
  const germ: Pt[] = [
    [-size * 0.2, -size * 0.08 + rand() * 0.6],
    [size * 0.2, -size * 0.08 + rand() * 0.6],
  ];
  return { outer, germ };
}

function smashed(seed: number, peeled: boolean) {
  const rand = rng(seed * 41 + 3);
  const outer = sampleClosed(ring(0, 0, 19, 11, seed, 0.22, 11), 3);
  const cracks: Pt[][] = Array.from({ length: 5 }, () => {
    const a = rand() * Math.PI * 2;
    const r0 = 2 + rand() * 4;
    const r1 = r0 + 5 + rand() * 6;
    const bend = (rand() * 2 - 1) * 0.3;
    return [0, 0.5, 1].map((t): Pt => {
      const r = r0 + (r1 - r0) * t;
      return [Math.cos(a + bend * t) * r * 1.5, Math.sin(a + bend * t) * r * 0.8];
    });
  });
  const skin = peeled
    ? []
    : Array.from({ length: 3 }, (_, i) => {
        const a = (i / 3) * Math.PI * 2 + rand();
        return sampleClosed(ring(Math.cos(a) * 22, Math.sin(a) * 14, 4 + rand() * 3, 2 + rand() * 2, seed + 9 + i, 0.35, 6), 2);
      });
  return { outer, cracks, skin };
}

export function cutGarlic(part: ClovePart, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean): GarlicCutResult {
  const rand = rng(seed * 37 + 5);
  const wob = () => rand() * 2 - 1;
  const kind = GARLIC_CUT[cut];

  if (kind === "halved" && part === "head") {
    const half = headSection(seed);
    return {
      heap: false,
      pieces: [
        { ...moved(half, wob() * 0.2, -31, 0), thick: 9, skinSide: true },
        { ...moved(headSection(seed + 1), wob() * 0.2, 31, 3), thick: 9, skinSide: true },
      ],
    };
  }

  switch (kind) {
    case "halved": {
      const h = halfClove(seed);
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [-x, y]);
      return {
        heap: false,
        pieces: [
          { ...moved(h, Math.PI / 2 + wob() * 0.15, 0, -10), thick: 3.5, skinSide: !peeled },
          { ...moved({ outer: mirror(h.outer), germ: mirror(h.germ) }, Math.PI / 2 + wob() * 0.15, 4, 12), thick: 3.5, skinSide: !peeled },
        ],
      };
    }
    case "sliced": {
      const row = Array.from({ length: 6 }, (_, i) => {
        const size = 6 + Math.sin(((i + 0.5) / 6) * Math.PI) * 3;
        return { ...moved(slice(seed + i, size), wob() * 0.25, -22 + i * 8.5, -6 + wob()), thick: 1.4, skinSide: false };
      });
      const loose = Array.from({ length: 4 }, (_, i) => ({
        ...moved(slice(seed + 20 + i, 6 + rand() * 3), rand() * Math.PI * 2, -18 + i * 13 + wob() * 3, 12 + wob() * 4),
        thick: 1.4,
        skinSide: false,
      }));
      return { heap: false, pieces: [...row, ...loose] };
    }
    case "diced":
    case "minced": {
      const fine = kind === "minced";
      const count = fine ? 110 : 44;
      const pieces = Array.from({ length: count }, (_, i) => {
        const a = i * 2.39996;
        const rad = Math.sqrt((i + 0.5) / count);
        const size = fine ? 1.3 + rand() * 0.6 : 3 + rand() * 1.4;
        const shape = { outer: sampleClosed(ring(0, 0, size, size * (0.7 + rand() * 0.3), seed + i * 3, 0.3, 5), 2) };
        const spread = fine ? [19, 12] : [26, 16];
        return {
          ...moved(shape, rand() * Math.PI * 2, Math.cos(a) * spread[0]! * rad, Math.sin(a) * spread[1]! * rad - (1 - rad) * 3),
          thick: fine ? 1 : 2,
          skinSide: false,
        };
      });
      return { heap: true, pieces };
    }
    case "smashed":
      return {
        heap: false,
        pieces: [
          { ...moved(smashed(seed, peeled), wob() * 0.4, -20, 0), thick: 2.2, skinSide: false },
          { ...moved(smashed(seed + 7, peeled), wob() * 0.4, 22, 4), thick: 2.2, skinSide: false },
        ],
      };
  }
}

/** The piece a scene would scatter: the biggest one, or a small cluster of mince. */
export function representativeGarlic(result: GarlicCutResult, cut: Exclude<Cut, "whole">): GarlicPiece[] {
  const area = (p: GarlicPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  if (GARLIC_CUT[cut] === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: GarlicPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 10);
  }
  return [result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a))];
}

/** Cooked garlic softens and slumps a little. */
export function softenGarlic(p: GarlicPiece): GarlicPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.93]);
  return { ...p, outer: s(p.outer), germ: p.germ && s(p.germ), thick: p.thick * 0.85 };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameGarlic(part: ClovePart, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean, layout: Layout, cooked: boolean) {
  const result = cutGarlic(part, cut, seed, peeled);
  const picked = layout === "piece" ? representativeGarlic(result, cut) : result.pieces;
  const shown = cooked ? picked.map(softenGarlic) : picked;
  return { result, ...frameCut(shown, layout === "piece" ? 6 : 1.5, shown.flatMap((p) => (p.skin ?? []).flat())) };
}
