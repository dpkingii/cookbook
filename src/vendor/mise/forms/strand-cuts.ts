import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid } from "../core/geometry";
import { rng, type Pt } from "../core/rough";
import { drape, part, rod, sprout, wave, WIDTH, type StrandPart, type StrandShape } from "./strand-shape";

/** Broken in half (as spaghetti for a soup), cut short, or chopped into bits. */
export type StrandCut = "broken" | "short" | "bits";

export const STRAND_CUT: Record<Exclude<Cut, "whole">, StrandCut> = {
  halved: "broken",
  wedges: "broken",
  sliced: "short",
  rings: "short",
  strips: "short",
  diced: "bits",
  minced: "bits",
};

export interface StrandCutResult {
  pieces: StrandPart[];
  heap: boolean;
}

/** A piece `len` long: a straight rod or crimped wave dry, a soft curve cooked. */
function piece(shape: StrandShape, rand: () => number, x: number, y: number, len: number, cooked: boolean, seed: number): StrandPart {
  if (shape === "sprout") return sprout(rand, x, y, len, cooked, seed);
  const w = WIDTH[shape];
  const angle = rand() * Math.PI * 2;
  let line: Pt[];
  if (cooked) {
    const bend = (rand() - 0.5) * 1.8;
    const n = Math.max(4, Math.round(len / 2));
    line = Array.from({ length: n + 1 }, (_, i): Pt => {
      const t = i / n;
      const a = angle + bend * t;
      return [x + Math.cos(a) * len * (t - 0.5), y + Math.sin(a) * len * (t - 0.5) * 0.8];
    });
  } else if (shape === "egg") line = wave(x - (Math.cos(angle) * len) / 2, y - (Math.sin(angle) * len) / 2, len, angle, 1.2, len / 6, rand() * 6);
  else line = rod(x - (Math.cos(angle) * len) / 2, y - (Math.sin(angle) * len) / 2, len, angle);
  return part(shape, line, w, seed, (rand() - 0.5) * 0.8);
}

function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

export function cutStrand(shape: StrandShape, cut: Exclude<Cut, "whole">, seed: number, cooked: boolean): StrandCutResult {
  const rand = rng(seed * 89 + 3);
  switch (STRAND_CUT[cut]) {
    case "broken": {
      /** Dry, the halves stay a bundle; cooked, a looser tangle of shorter strands. */
      const n = shape === "flat" ? 10 : 22;
      /** A bean sprout snapped in two is just a shorter sprout. */
      if (shape === "sprout") return { heap: true, pieces: Array.from({ length: 30 }, (_, i) => piece(shape, rand, (rand() - 0.5) * 40, (rand() - 0.5) * 22, 11 + rand() * 3, cooked, seed * 50 + i)) };
      if (cooked) return { heap: true, pieces: Array.from({ length: n }, (_, i) => part(shape, drape(rand, 0, 0, 24, 15, 32 + rand() * 12, shape === "egg"), WIDTH[shape], seed * 50 + i, (rand() - 0.5) * 0.8)) };
      const angle = -0.25;
      return {
        heap: false,
        pieces: Array.from({ length: n }, (_, i) => {
          const across = (i / (n - 1) - 0.5) * (shape === "flat" ? 18 : 12);
          const len = 42 + (rand() - 0.5) * 3;
          const [x, y] = [-Math.cos(angle) * len * 0.5 - Math.sin(angle) * across, -Math.sin(angle) * len * 0.5 + Math.cos(angle) * across];
          const line = shape === "egg" ? wave(x, y, len, angle + (rand() - 0.5) * 0.06, 1.2, 7, rand() * 6) : rod(x, y, len, angle + (rand() - 0.5) * 0.06);
          return part(shape, line, WIDTH[shape], seed * 50 + i, (rand() - 0.5) * 0.8);
        }),
      };
    }
    case "short":
    case "bits": {
      const bits = STRAND_CUT[cut] === "bits";
      const n = bits ? 70 : 34;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const [x, y] = golden(i, n, bits ? 18 : 22, bits ? 11 : 14);
          const len = bits ? 2.6 + rand() * 1.2 : 9 + rand() * 4;
          return piece(shape, rand, x, y, len, cooked, seed * 50 + i);
        }),
      };
    }
  }
}

/** The piece a scene would scatter: a few strands from the middle of the heap. */
export function representativeStrand(result: StrandCutResult, cut: Exclude<Cut, "whole">): StrandPart[] {
  const mid = centroid(result.pieces.flatMap((p) => p.outer));
  const near = (p: StrandPart) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
  return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, STRAND_CUT[cut] === "broken" ? 3 : 5);
}

export function frameStrand(shape: StrandShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutStrand(shape, cut, seed, cooked);
  const picked = layout === "piece" ? representativeStrand(result, cut) : result.pieces;
  return { result, ...frameCut(picked, layout === "piece" ? 6 : 1.5) };
}
