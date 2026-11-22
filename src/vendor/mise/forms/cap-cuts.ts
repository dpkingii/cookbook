import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { bbox, centroid, clip, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { fan, silhouette, type CapShape } from "./cap-shape";

/** Cross-section halves and slices, quarters, thin strips (torn, for oyster mushrooms), dice and mince. */
export type CapCut = "halves" | "slices" | "quarters" | "strips" | "torn" | "diced" | "minced";

export const CAP_CUT: Record<CapShape, Record<Exclude<Cut, "whole">, CapCut>> = {
  button: { halved: "halves", sliced: "slices", rings: "slices", strips: "slices", wedges: "quarters", diced: "diced", minced: "minced" },
  /** Shiitake caps are sliced thin with the woody stem left out. */
  shiitake: { halved: "halves", sliced: "strips", rings: "strips", strips: "strips", wedges: "quarters", diced: "diced", minced: "minced" },
  /** Oyster mushrooms are torn by hand, into clumps or along their gills into strips. */
  oyster: { halved: "torn", wedges: "torn", sliced: "strips", rings: "strips", strips: "strips", diced: "diced", minced: "minced" },
};

export interface CapPiece {
  /** face: a cut cross-section; fan: a torn piece of oyster mushroom; bit: a chopped scrap. */
  kind: "face" | "fan" | "bit";
  outer: Pt[];
  /** The cap's skin along a face's top. */
  top?: Pt[];
  /** The gill band under a cut cap. */
  gills?: Pt[];
  /** Gill lines on an oyster piece. */
  lines?: Pt[][];
  /** A chopped scrap with the cap's skin on it. */
  skin?: boolean;
  thick: number;
  group: number;
}

export interface CapCutResult {
  pieces: CapPiece[];
  heap: boolean;
}

function moved(p: CapPiece, rot: number, x: number, y: number, squash = 0.85): CapPiece {
  const [cx, cy] = centroid(p.outer);
  const go = (pts: Pt[]) => layFlat(pts.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return { ...p, outer: go(p.outer), top: p.top && go(p.top), gills: p.gills && go(p.gills), lines: p.lines?.map(go) };
}

function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

/** A cross-section through the mushroom at `W` wide; near the edge of the cap a slice catches no stem. */
function face(shape: Exclude<CapShape, "oyster">, W: number, seed: number, capOnly = false): CapPiece {
  const s = silhouette(shape, W, seed);
  const outer = capOnly ? [...s.top, ...[...s.under].reverse().map(([x, y]): Pt => [x, y * 0.6])] : s.outline;
  return { kind: "face", outer, top: s.top, gills: capOnly ? undefined : s.gills, thick: 1.2, group: 0 };
}

export function cutCap(shape: CapShape, cut: Exclude<Cut, "whole">, seed: number): CapCutResult {
  const rand = rng(seed * 83 + 9);
  const wob = () => rand() * 2 - 1;
  const cc = CAP_CUT[shape][cut];
  if (shape !== "oyster" && (cc === "halves" || cc === "slices" || cc === "quarters")) {
    const W = shape === "button" ? 30 : 40;
    if (cc === "halves") return { heap: false, pieces: [0, 1].map((i) => ({ ...moved({ ...face(shape, W, seed + i), thick: 5 }, wob() * 0.1, (i - 0.5) * (W + 6), 0), group: i })) };
    if (cc === "slices") {
      /** Slices fall in a row; the end ones are just a crescent of cap. */
      const k = [0.6, 0.85, 1, 1, 0.85, 0.6];
      return { heap: false, pieces: k.map((f, i) => ({ ...moved(face(shape, W * f, seed + i, f < 0.7), wob() * 0.15, (i - 2.5) * W * 0.42, Math.abs(i - 2.5) * 2), group: i })) };
    }
    /** A quarter: half a cross-section, cut again down the stem, lying on its side. */
    return {
      heap: false,
      pieces: Array.from({ length: 4 }, (_, i) => {
        const f = face(shape, W, seed + i);
        const half = clip(f.outer, [-1, 0], 0);
        const [col, row] = [i % 2, Math.floor(i / 2)];
        return { ...moved({ ...f, outer: half, top: f.top?.filter(([x]) => x >= 0), gills: f.gills && clip(f.gills, [-1, 0], 0), thick: 6 }, (col ? Math.PI * 0 : 0) + wob() * 0.15, (col - 0.5) * 30, (row - 0.5) * 30), group: i };
      }),
    };
  }
  switch (cc) {
    case "strips": {
      if (shape === "oyster") {
        /** Torn along the gills: thin fan-shaped slivers. */
        const n = 14;
        return {
          heap: true,
          pieces: Array.from({ length: n }, (_, i) => {
            const f = fan(18 + rand() * 6, 0.55, -Math.PI / 2, seed * 10 + i);
            const [x, y] = golden(i, n, 22, 13);
            return { ...moved({ kind: "fan", outer: f.outline, lines: f.gills.filter((_, j) => j % 3 === 1), thick: 0.8, group: i }, rand() * 6.28, x, y), group: i };
          }),
        };
      }
      /** Thin slices of cap: curved strips, the brown skin along one edge. */
      const n = 16;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const len = 16 + rand() * 6;
          const w = 3.2;
          const mid = Array.from({ length: 9 }, (_, j): Pt => {
            const t = j / 8 - 0.5;
            return [t * len, -(1 - 4 * t * t) * len * 0.18];
          });
          const top = mid.map(([x, y]): Pt => [x, y - w / 2]);
          const outer = [...top, ...[...mid].reverse().map(([x, y]): Pt => [x, y + w / 2])];
          const [x, y] = golden(i, n, 22, 13);
          return { ...moved({ kind: "face", outer, top, thick: 1, group: i }, rand() * 6.28, x, y), group: i };
        }),
      };
    }
    case "torn": {
      const n = 7;
      return {
        heap: false,
        pieces: Array.from({ length: n }, (_, i) => {
          const f = fan(15 + rand() * 4, 1.3 + rand() * 0.4, -Math.PI / 2, seed * 10 + i);
          const [x, y] = golden(i, n, 26, 16);
          return { ...moved({ kind: "fan", outer: f.outline, lines: f.gills, thick: 1, group: i }, rand() * 6.28, x, y), group: i };
        }),
      };
    }
    case "diced":
    case "minced":
    default: {
      const fine = cc === "minced";
      const n = fine ? 100 : 40;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const sz = fine ? 1.2 + rand() * 0.5 : 3.2 + rand() * 1;
          const [x, y] = golden(i, n, fine ? 18 : 22, fine ? 11 : 14);
          const r = Math.hypot(x / 22, y / 14);
          return { ...moved({ kind: "bit", outer: sampleClosed(ring(0, 0, sz, sz * 0.8, seed + i * 3, 0.2, 5), 2), skin: rand() < 0.35, thick: sz * 0.4, group: i }, rand() * 6.28, x, y - (1 - r) * 3), group: i };
        }),
      };
    }
  }
}

/** The piece a scene would scatter: one slice, half, quarter or torn piece, or a few chopped bits. */
export function representativeCap(result: CapCutResult, shape: CapShape, cut: Exclude<Cut, "whole">): CapPiece[] {
  const cc = CAP_CUT[shape][cut];
  if (cc === "diced" || cc === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: CapPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, cc === "minced" ? 10 : 5);
  }
  const size = (p: CapPiece) => bbox(p.outer).w * bbox(p.outer).h;
  return [result.pieces.reduce((a, b) => (size(b) > size(a) ? b : a))];
}

/** Mushrooms give up their water and shrink as they cook. */
export function shrinkCap(p: CapPiece): CapPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.84, cy + (y - cy) * 0.84]);
  return { ...p, outer: s(p.outer), top: p.top && s(p.top), gills: p.gills && s(p.gills), lines: p.lines?.map(s), thick: p.thick * 0.7 };
}

export function frameCap(shape: CapShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutCap(shape, cut, seed);
  const picked = layout === "piece" ? representativeCap(result, shape, cut) : result.pieces;
  return { result, ...frameCut(cooked ? picked.map(shrinkCap) : picked, layout === "piece" ? 6 : 1.5) };
}
