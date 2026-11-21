import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import type { RootShape } from "./root-shape";
import { line, outlineOf } from "./stalk-shape";

/**
 * What cooks do with roots: coins across a carrot, lengthwise halves, matchsticks (batons for potato), dice, mince,
 * and chunks: a carrot roll-cut, potato wedges, daikon half-moons.
 */
export type RootCut = "halved" | "coins" | "sticks" | "diced" | "minced" | "chunks";

export const ROOT_CUT: Record<Exclude<Cut, "whole">, RootCut> = {
  halved: "halved",
  sliced: "coins",
  rings: "coins",
  strips: "sticks",
  diced: "diced",
  minced: "minced",
  wedges: "chunks",
};

export interface RootPiece {
  outer: Pt[];
  thick: number;
  /** A band of skin all round the cut face's edge, as on an unpeeled coin. */
  rim: boolean;
  /** Skin along part of the edge only, as on the rounded back of a potato wedge. */
  skinEdge?: Pt[];
  /** The inner core across the face: a carrot's paler heart, or the faint vessel ring in daikon and potato. */
  core?: Pt[];
  /** A chunk's angled end, showing flesh and core. */
  cap?: { outer: Pt[]; core: Pt[] };
  /** Mostly core-coloured (a die cut from the middle of a carrot) rather than flesh. */
  heart?: boolean;
  /** The side wall is skin, as on a coin or a wedge, rather than cut flesh. */
  skinSide: boolean;
}

export interface RootCutResult {
  pieces: RootPiece[];
  heap: boolean;
}

type Shape = Pick<RootPiece, "outer" | "skinEdge" | "core" | "cap">;

function moved(shape: Shape, rot: number, x: number, y: number, squash = 0.8): Shape {
  const [cx, cy] = centroid(shape.outer);
  const go = (p: Pt[]) => layFlat(p.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return {
    outer: go(shape.outer),
    skinEdge: shape.skinEdge && go(shape.skinEdge),
    core: shape.core && go(shape.core),
    cap: shape.cap && { outer: go(shape.cap.outer), core: go(shape.cap.core) },
  };
}

/** Sizes in the cut's own units: a coin's radius, a split root's length and width, a die, a stick. */
const SIZE: Record<RootShape, { coin: number; oval: number; length: number; width: number; die: number; stick: [number, number] }> = {
  carrot: { coin: 5.4, oval: 1, length: 56, width: 11, die: 3.4, stick: [20, 1.8] },
  daikon: { coin: 10, oval: 1, length: 52, width: 19, die: 3.6, stick: [22, 1.9] },
  potato: { coin: 8.4, oval: 1.3, length: 40, width: 27, die: 3.8, stick: [26, 4.2] },
};

/** How much of a coin's face is a carrot's core, or how far in the faint vessel ring sits on daikon and potato. */
const CORE: Record<RootShape, number> = { carrot: 0.5, daikon: 0.86, potato: 0.86 };

function coin(shape: RootShape, r: number, seed: number): Shape {
  const rand = rng(seed * 13 + 3);
  const o = SIZE[shape].oval;
  const pts = ring(0, 0, r * o, r * (0.9 + rand() * 0.08), seed, shape === "potato" ? 0.08 : 0.04, 10);
  const outer = sampleClosed(pts, 3);
  const c = CORE[shape];
  return { outer, core: sampleClosed(pts.map(([x, y]): Pt => [x * c + r * 0.03, y * c]), 3) };
}

/** A root split lengthwise and laid cut side up: the taper of the whole root, with its core running down the middle. */
function half(shape: RootShape, seed: number): Shape {
  const rand = rng(seed * 31 + 7);
  const { length, width } = SIZE[shape];
  if (shape === "potato") {
    const pts = ring(0, 0, length / 2, width / 2, seed, 0.07, 11);
    return { outer: sampleClosed(pts, 3), core: sampleClosed(pts.map(([x, y]): Pt => [x * 0.86, y * 0.84]), 3) };
  }
  const spine = line([-length / 2, 0], 0, length, (rand() * 2 - 1) * 1.5, 0, 24);
  const prof = (k: number) =>
    spine.map((_, i) => {
      const t = i / (spine.length - 1);
      const shoulder = Math.sqrt(Math.min(1, 0.5 + t / 0.05));
      const body = shape === "carrot" ? 1 - 0.85 * t ** 1.25 : 1 - 0.85 * Math.max(0, (t - 0.62) / 0.38) ** 1.4;
      return Math.max(0.5, width * shoulder * body * k);
    });
  return {
    outer: sampleClosed(outlineOf(spine, prof(1), "round", "round"), 1),
    core: sampleClosed(outlineOf(spine, prof(CORE[shape] * (shape === "carrot" ? 1 : 0.95)), "round", "round"), 1),
  };
}

function block(l: number, w: number, seed: number): Shape {
  const rand = rng(seed * 17 + 1);
  const j = () => (rand() * 2 - 1) * Math.min(l, w) * 0.07;
  const [hl, hw] = [l / 2, w / 2];
  return {
    outer: [
      [-hl + j(), -hw + j()],
      [hl + j(), -hw + j()],
      [hl + j(), hw + j()],
      [-hl + j(), hw + j()],
    ],
  };
}

/** A carrot roll-cut: a short length of root with one end cut on a slant, the slanted face showing its core. */
function rollCut(r: number, seed: number): Shape {
  const rand = rng(seed * 19 + 5);
  const l = r * (2 + rand() * 0.5);
  const slant = r * (0.7 + rand() * 0.4);
  const outer: Pt[] = [
    [-l / 2, -r],
    [l / 2 + slant, -r],
    [l / 2 - slant * 0.2, r],
    [-l / 2, r],
  ];
  const mid: Pt = [l / 2 + slant * 0.4, 0];
  const face = sampleClosed(ring(mid[0], mid[1], slant * 0.55 + 1, r, seed, 0.03, 8), 2);
  return {
    outer: sampleClosed(outer, 2),
    cap: { outer: face, core: face.map(([x, y]): Pt => [mid[0] + (x - mid[0]) * 0.5, y * 0.5]) },
  };
}

/** A potato wedge: long, flat cut faces meeting at an edge, with the skin along its rounded back. */
function wedge(l: number, w: number, seed: number): Shape {
  const rand = rng(seed * 23 + 9);
  const back = Array.from({ length: 13 }, (_, i): Pt => {
    const a = Math.PI + (i / 12) * Math.PI;
    return [Math.cos(a) * l * 0.5, Math.sin(a) * w * (0.95 + rand() * 0.1)];
  });
  const edge: Pt[] = [
    [l * 0.4, w * 0.18],
    [0, w * 0.32],
    [-l * 0.4, w * 0.18],
  ];
  return { outer: [...back, ...edge], skinEdge: back };
}

/** A daikon half-moon: a thick half-disc, skin round the curve. */
function halfMoon(r: number, seed: number): Shape {
  const rand = rng(seed * 29 + 11);
  const arc = Array.from({ length: 13 }, (_, i): Pt => {
    const a = Math.PI + (i / 12) * Math.PI;
    return [Math.cos(a) * r, Math.sin(a) * r * (0.96 + rand() * 0.06)];
  });
  const c = CORE.daikon;
  return { outer: [...arc, [r * 0.5, 0], [-r * 0.5, 0]], skinEdge: arc, core: arc.map(([x, y]): Pt => [x * c, y * c]) };
}

const golden = (i: number, n: number, rx: number, ry: number): Pt => {
  const a = i * 2.39996;
  const d = Math.sqrt((i + 0.5) / n);
  return [Math.cos(a) * rx * d, Math.sin(a) * ry * d];
};

export function cutRoot(shape: RootShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean): RootCutResult {
  const rand = rng(seed * 43 + 13);
  const wob = () => rand() * 2 - 1;
  const size = SIZE[shape];
  const skin = !peeled;

  switch (ROOT_CUT[cut]) {
    case "coins": {
      /** Coins fall off the knife in an overlapping row, shrinking along the carrot's taper, with a few knocked loose. */
      const n = shape === "carrot" ? 9 : shape === "daikon" ? 5 : 6;
      const step = size.coin * size.oval * (shape === "carrot" ? 1.15 : 1.05);
      const row = Array.from({ length: n }, (_, i) => {
        const taper = shape === "carrot" ? 1.12 - (0.4 * i) / (n - 1) : 0.92 + Math.sin(((i + 0.5) / n) * Math.PI) * 0.12;
        return {
          ...moved(coin(shape, size.coin * taper, seed + i), wob() * 0.25, (i - (n - 1) / 2) * step, -size.coin * 0.6 + wob()),
          thick: shape === "daikon" ? 2.4 : 1.8,
          rim: skin,
          skinSide: skin,
        };
      });
      const loose = Array.from({ length: shape === "daikon" ? 2 : 4 }, (_, i) => ({
        ...moved(coin(shape, size.coin * (0.8 + rand() * 0.25), seed + 20 + i), rand() * 6.28, (i - 1.5) * step * 1.6 + wob() * 3, size.coin * 1.3 + wob() * 2),
        thick: shape === "daikon" ? 2.4 : 1.8,
        rim: skin,
        skinSide: skin,
      }));
      return { heap: false, pieces: [...row, ...loose] };
    }
    case "halved": {
      const h = half(shape, seed);
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [x, -y]);
      const other: Shape = { outer: mirror(h.outer), core: h.core && mirror(h.core) };
      const gap = size.width * (shape === "potato" ? 0.62 : 0.72);
      const thick = size.width * (shape === "potato" ? 0.14 : 0.3);
      return {
        heap: false,
        pieces: [
          { ...moved(h, -0.1 + wob() * 0.05, -2, -gap), thick, rim: skin, skinSide: skin },
          { ...moved(other, -0.06 + wob() * 0.05, 3, gap), thick, rim: skin, skinSide: skin },
        ],
      };
    }
    case "sticks": {
      /** Matchsticks for carrot and daikon; thick batons, the start of chips, for potato. */
      const n = shape === "potato" ? 11 : 24;
      const [l, w] = size.stick;
      const pieces = Array.from({ length: n }, (_, i) => {
        const [x, y] = golden(i, n, shape === "potato" ? 13 : 15, shape === "potato" ? 14 : 11);
        return {
          ...moved(block(l * (0.85 + rand() * 0.25), w * (0.9 + rand() * 0.2), seed + i), 0.3 + wob() * (shape === "potato" ? 0.2 : 0.4), x, y),
          thick: w * 0.8,
          rim: false,
          skinSide: false,
          heart: shape === "carrot" && rand() < 0.3,
        };
      });
      return { heap: true, pieces };
    }
    case "diced":
    case "minced": {
      const fine = ROOT_CUT[cut] === "minced";
      const n = fine ? 120 : 44;
      const pieces = Array.from({ length: n }, (_, i) => {
        const s = fine ? 1.1 + rand() * 0.5 : size.die * (0.9 + rand() * 0.2);
        const [x, y] = golden(i, n, fine ? 19 : 24, fine ? 12 : 15);
        const r = Math.hypot(x / 24, y / 15);
        return {
          ...moved(fine ? { outer: sampleClosed(ring(0, 0, s, s * (0.7 + rand() * 0.3), seed + i * 3, 0.25, 5), 2) } : block(s, s * (0.9 + rand() * 0.15), seed + i * 3), rand() * 6.28, x, y - (1 - r) * 3),
          thick: fine ? 1 : s * 0.75,
          rim: false,
          skinSide: false,
          /** A carrot's dice come from both its core and its outer flesh, so some are paler. */
          heart: shape === "carrot" && rand() < 0.35,
        };
      });
      return { heap: true, pieces };
    }
    case "chunks": {
      if (shape === "potato") {
        const n = 8;
        const pieces = Array.from({ length: n }, (_, i) => {
          const [col, row] = [i % 2, Math.floor(i / 2)];
          return {
            ...moved(wedge(30 + rand() * 6, 9 + rand() * 1.5, seed + i), -0.25 + wob() * 0.12 + (col ? Math.PI : 0), (col - 0.5) * 30 + row * 3, (row - 1.5) * 9 + col * 3),
            thick: 6,
            rim: false,
            skinSide: false,
          };
        });
        return { heap: false, pieces };
      }
      if (shape === "daikon") {
        const pieces = Array.from({ length: 6 }, (_, i) => {
          const [col, row] = [i % 3, Math.floor(i / 3)];
          return {
            ...moved(halfMoon(size.coin * (0.92 + rand() * 0.1), seed + i), wob() * 0.3 + (row ? Math.PI : 0), (col - 1) * 22 + row * 5, (row - 0.5) * 15),
            thick: 5,
            rim: false,
            skinSide: skin,
          };
        });
        return { heap: false, pieces };
      }
      /** Roll-cut chunks lie apart in two loose rows, each turned its own way so the slanted faces show. */
      const pieces = Array.from({ length: 6 }, (_, i) => {
        const [col, row] = [i % 3, Math.floor(i / 3)];
        return {
          ...moved(rollCut(size.coin * (1.05 - i * 0.05), seed + i), wob() * 0.5 + (row ? Math.PI : 0), (col - 1) * 19 + row * 6 + wob() * 2, (row - 0.5) * 17),
          thick: size.coin * 0.9,
          rim: false,
          skinSide: skin,
        };
      });
      return { heap: false, pieces };
    }
  }
}

/** The piece a scene would scatter: the biggest one, or a small cluster of mince. */
export function representativeRoot(result: RootCutResult, cut: Exclude<Cut, "whole">): RootPiece[] {
  const area = (p: RootPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  if (ROOT_CUT[cut] === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: RootPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 10);
  }
  return [result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a))];
}

/** Cooked root softens and shrinks a little as it loses water. */
export function softenRoot(p: RootPiece): RootPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.92, cy + (y - cy) * 0.92]);
  return { ...p, outer: s(p.outer), skinEdge: p.skinEdge && s(p.skinEdge), core: p.core && s(p.core), cap: p.cap && { outer: s(p.cap.outer), core: s(p.cap.core) }, thick: p.thick * 0.85 };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameRoot(shape: RootShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean, layout: Layout, cooked: boolean) {
  const result = cutRoot(shape, cut, seed, peeled);
  const picked = layout === "piece" ? representativeRoot(result, cut) : result.pieces;
  return { result, ...frameCut(cooked ? picked.map(softenRoot) : picked, layout === "piece" ? 6 : 1.5) };
}
