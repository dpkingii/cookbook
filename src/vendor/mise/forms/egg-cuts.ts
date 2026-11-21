import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { bbox, centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { blob, eggOutline, type EggState } from "./egg-shape";

/**
 * What becomes of an egg under the knife or in the pan. A boiled egg is halved, sliced, quartered, chopped or grated;
 * beaten egg sets into curds (scrambled), ribbons (an omelette cut in strips) or bits (fine, as in fried rice).
 */
export type EggCut = "halves" | "slices" | "quarters" | "chopped" | "grated" | "curds" | "ribbons" | "bits";

const BOILED: Record<Exclude<Cut, "whole">, EggCut> = {
  halved: "halves",
  sliced: "slices",
  rings: "slices",
  strips: "slices",
  wedges: "quarters",
  diced: "chopped",
  minced: "grated",
};
const BEATEN: Record<Exclude<Cut, "whole">, EggCut> = {
  halved: "curds",
  /** An omelette sliced is cut into ribbons. */
  sliced: "ribbons",
  wedges: "curds",
  diced: "curds",
  strips: "ribbons",
  rings: "ribbons",
  minced: "bits",
};

/** The cut an egg in this state draws, or null when it has none (a cracked egg, or any egg whole). */
export function eggCut(state: EggState, cut: Cut): EggCut | null {
  if (cut === "whole" || state === "cracked") return null;
  return state === "beaten" ? BEATEN[cut] : BOILED[cut];
}

export interface EggPiece {
  /** boiled: a piece of boiled egg, white with perhaps some yolk; curd: a soft fold of scrambled egg; ribbon: a strip of omelette; bit: a crumb of egg. */
  kind: "boiled" | "curd" | "ribbon" | "bit";
  outer: Pt[];
  thick: number;
  /** The yolk showing on a cut face. */
  yolk?: Pt[];
  /** A crumb or curd that is mostly yolk rather than white. */
  yolky?: boolean;
  /** Where a curd folds over on itself. */
  fold?: Pt[];
}

export interface EggCutResult {
  pieces: EggPiece[];
  heap: boolean;
}

function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

function moved(p: EggPiece, rot: number, x: number, y: number, squash = 0.8): EggPiece {
  const [cx, cy] = centroid(p.outer);
  const go = (pts: Pt[]) => layFlat(pts.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return { ...p, outer: go(p.outer), yolk: p.yolk && go(p.yolk), fold: p.fold && go(p.fold) };
}

/** A boiled egg is 5.7 cm long and 4.4 across; in box units, 40 by 31. */
const L = 40;
const W = 31;
/** A firm yolk takes up a little over half the egg's width. */
const YOLK = 0.58;

/** Half a boiled egg, cut lengthwise and lying cut side up: the egg's outline with the yolk sitting toward the blunt end. */
function half(seed: number, soft: boolean): EggPiece {
  const outer = eggOutline(0, 0, L, W, seed, 40);
  const r = (W / 2) * YOLK * (soft ? 1.05 : 1);
  return { kind: "boiled", outer, thick: 5, yolk: blob(L * 0.06, 0, r * 1.15, r, seed + 2, soft ? 0.05 : 0.025, 28) };
}

/** A slice across the egg: round, with a yolk that is biggest in the middle slices and missing from the ends. */
function slice(i: number, n: number, seed: number): EggPiece {
  const t = (i + 0.5) / n;
  const across = Math.sin(Math.PI * (0.08 + t * 0.84)) * (1 + 0.1 * (t - 0.5));
  const r = (W / 2) * across;
  const y = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.18) / 0.7)))) * (W / 2) * YOLK;
  return { kind: "boiled", outer: sampleClosed(ring(0, 0, r, r * 0.97, seed, 0.015, 12), 3), thick: 2.6, yolk: y > 1.5 ? blob(0, 0, y, y * 0.96, seed + 1, 0.03, 24) : undefined };
}

/** A lengthwise quarter lying on one cut face: a long half-egg shape with the yolk along its flat edge. */
function quarter(seed: number): EggPiece {
  const rand = rng(seed * 13 + 1);
  const arc = Array.from({ length: 25 }, (_, i): Pt => {
    const a = Math.PI + (i / 24) * Math.PI;
    return [Math.cos(a) * (L / 2), Math.sin(a) * (W * 0.62) * (1 + 0.13 * Math.cos(a)) * (1 + (rand() - 0.5) * 0.01)];
  });
  const flat: Pt[] = [
    [L / 4, 0.4],
    [-L / 4, 0.4],
  ];
  const outer = [...arc, ...flat];
  const r = (W / 2) * YOLK * 0.6;
  const yolk = Array.from({ length: 16 }, (_, i): Pt => {
    const a = Math.PI + (i / 15) * Math.PI;
    return [L * 0.05 + Math.cos(a) * r * 1.6, Math.sin(a) * r];
  });
  return { kind: "boiled", outer: [...outer, ...flat], thick: 7, yolk };
}

export function cutEgg(state: EggState, cut: Exclude<Cut, "whole">, seed: number, soft = false): EggCutResult {
  const rand = rng(seed * 101 + 17);
  const wob = () => rand() * 2 - 1;
  const ec = eggCut(state, cut);
  switch (ec) {
    case null:
      return { heap: false, pieces: [] };
    case "halves":
      return {
        heap: false,
        pieces: [moved(half(seed, soft), -0.12 + wob() * 0.05, -2, -14), moved(half(seed + 3, soft), Math.PI + 0.1 + wob() * 0.05, 4, 15)],
      };
    case "slices": {
      /** The slices fall in a row, each overlapping the last, as they come off an egg slicer. */
      const n = 6;
      return { heap: false, pieces: Array.from({ length: n }, (_, i) => moved(slice(i, n, seed + i), wob() * 0.2, (i - (n - 1) / 2) * 11, wob() * 1.5 + Math.abs(i - 2.5) * 1.2, 0.8)) };
    }
    case "quarters":
      return {
        heap: false,
        pieces: Array.from({ length: 4 }, (_, i) => {
          const [col, row] = [i % 2, Math.floor(i / 2)];
          return moved(quarter(seed + i), (col ? Math.PI : 0) + wob() * 0.12 + (row ? 0.15 : -0.15), (col - 0.5) * 30, (row - 0.5) * 22 + (col ? 4 : -4), 0.85);
        }),
      };
    case "chopped":
    case "grated":
    case "bits": {
      /** Chopped boiled egg is mostly white with crumbs of yolk; fine bits of fried-rice egg are all yellow. */
      const fine = ec !== "chopped";
      const n = fine ? 110 : 46;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const s = fine ? 1.4 + rand() * 0.8 : 3 + rand() * 1.4;
          const [x, y] = golden(i, n, fine ? 20 : 24, fine ? 12 : 15);
          const r = Math.hypot(x / 24, y / 15);
          const yolky = ec === "bits" || rand() < (ec === "grated" ? 0.45 : 0.3);
          return moved({ kind: "bit", outer: sampleClosed(ring(0, 0, s, s * 0.8, seed + i * 3, ec === "bits" ? 0.32 : 0.22, 5), 2), thick: s * 0.5, yolky }, rand() * 6.28, x, y - (1 - r) * 3);
        }),
      };
    }
    case "curds": {
      /** Soft folds of scrambled egg, heaped loosely, a few streaked with set white. */
      const n = 13;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const s = 6.5 + rand() * 3;
          const [x, y] = golden(i, n, 24, 15);
          const r = Math.hypot(x / 24, y / 15);
          const outer = blob(0, 0, s, s * 0.72, seed * 7 + i, 0.11, 26);
          const fold = Array.from({ length: 5 }, (_, j): Pt => [-s * 0.6 + (j / 4) * s * 1.1, -s * 0.15 + Math.sin((j / 4) * Math.PI) * s * 0.3]);
          return moved({ kind: "curd", outer, thick: s * 0.25, fold, yolky: rand() < 0.8 }, rand() * 6.28, x, y - (1 - r) * 5);
        }),
      };
    }
    case "ribbons": {
      /** An omelette rolled and cut across: thin curling strips. */
      const n = 22;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const len = 16 + rand() * 8;
          const w = 1.6;
          const phase = rand() * 6;
          const line = Array.from({ length: 9 }, (_, j): Pt => [(j / 8) * len, Math.sin((j / 8) * Math.PI * 1.3 + phase) * len * 0.05]);
          const side = (sgn: number) => line.map(([px, py]): Pt => [px, py + sgn * (w / 2) * (j0(px, len))]);
          const [x, y] = golden(i, n, 22, 14);
          return moved({ kind: "ribbon", outer: [...side(1), ...side(-1).reverse()], thick: 0.8 }, rand() * 6.28, x, y);
        }),
      };
    }
  }
}

/** Strips taper a little at their cut ends. */
const j0 = (x: number, len: number) => 0.7 + 0.3 * Math.sin((x / len) * Math.PI);

/** The piece a scene would scatter: the biggest one, or a small cluster of the fine stuff. */
export function representativeEgg(result: EggCutResult, ec: EggCut): EggPiece[] {
  if (result.pieces.length === 0) return [];
  if (ec === "chopped" || ec === "grated" || ec === "bits") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: EggPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, ec === "chopped" ? 6 : 10);
  }
  const size = (p: EggPiece) => bbox(p.outer).w * bbox(p.outer).h;
  return [result.pieces.reduce((a, b) => (size(b) > size(a) ? b : a))];
}

/** The pieces as drawn for this cut and layout, and the zoom that fits them in the box. Cooking does not change their shape. */
export function frameEgg(state: EggState, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, soft = false) {
  const result = cutEgg(state, cut, seed, soft);
  const ec = eggCut(state, cut)!;
  const picked = layout === "piece" ? representativeEgg(result, ec) : result.pieces;
  return { result, ...frameCut(picked, layout === "piece" ? 6 : 1.5) };
}
