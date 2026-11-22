import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { bbox, centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { bellOutline, chiliPod, type PepperShape } from "./pepper-shape";

/** Halves showing the hollow; rings across; strips lengthwise; a bell pepper's quarters; dice; mince. */
export type PepperCut = "halves" | "rings" | "strips" | "quarters" | "diced" | "minced";

export const PEPPER_CUT: Record<PepperShape, Record<Exclude<Cut, "whole">, PepperCut>> = {
  bell: { halved: "halves", sliced: "rings", rings: "rings", strips: "strips", wedges: "quarters", diced: "diced", minced: "minced" },
  /** Chilies are sliced into rings, split lengthwise, slivered, or chopped fine; there are no chili quarters. */
  chili: { halved: "halves", sliced: "rings", rings: "rings", strips: "strips", wedges: "halves", diced: "minced", minced: "minced" },
};

export interface PepperPiece {
  outer: Pt[];
  /** The hollow inside a half or a ring. */
  hollow?: Pt[];
  /** Pale ribs inside a half or quarter. */
  ribs?: Pt[][];
  /** Seeds, as centres. */
  seeds?: Pt[];
  /** A piece whose top face is the glossy skin, rather than the cut flesh. */
  skin: boolean;
  thick: number;
  /** A half keeps the stem. */
  stem?: Pt[];
  group: number;
}

export interface PepperCutResult {
  pieces: PepperPiece[];
  heap: boolean;
}

function moved(p: PepperPiece, rot: number, x: number, y: number, squash = 0.8): PepperPiece {
  const [cx, cy] = centroid(p.outer);
  const go = (pts: Pt[]) => layFlat(pts.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return { ...p, outer: go(p.outer), hollow: p.hollow && go(p.hollow), ribs: p.ribs?.map(go), seeds: p.seeds && go(p.seeds), stem: p.stem && go(p.stem) };
}

function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

const shrink = (pts: Pt[], k: number): Pt[] => {
  const [cx, cy] = centroid(pts);
  return pts.map(([x, y]): Pt => [cx + (x - cx) * k, cy + (y - cy) * k]);
};

/** A bell pepper's ring: lobed, a thin wall round a hollow. */
function bellRing(r: number, seed: number): PepperPiece {
  const outer = Array.from({ length: 48 }, (_, i): Pt => {
    const a = (i / 48) * Math.PI * 2;
    const k = 1 + 0.08 * Math.cos(4 * a + seed) - 0.04 * Math.abs(Math.sin(2 * a));
    return [Math.cos(a) * r * k, Math.sin(a) * r * k];
  });
  return { outer, hollow: shrink(outer, 0.84), skin: false, thick: 1.2, group: 0 };
}

export function cutPepper(shape: PepperShape, cut: Exclude<Cut, "whole">, seed: number): PepperCutResult {
  const rand = rng(seed * 71 + 5);
  const wob = () => rand() * 2 - 1;
  const bell = shape === "bell";
  switch (PEPPER_CUT[shape][cut]) {
    case "halves": {
      if (bell) {
        /** Cut top to bottom and laid open: the wall, the pale ribs and the seeds clustered under the stem. */
        const half = (i: number): PepperPiece => {
          const outer = bellOutline(0, 0, 22, 24, seed + i, 56);
          const hollow = shrink(outer, 0.84);
          const ribs = [-0.4, 0, 0.4].map((f) => [
            [f * 6, -12],
            [f * 16, 4],
            [f * 13, 16],
          ] as Pt[]);
          const seeds = Array.from({ length: 14 }, (): Pt => [wob() * 6, -11 + rand() * 9]);
          const stem: Pt[] = [
            [-2, -22],
            [-1, -30],
            [3, -31],
            [2, -22],
          ];
          return { outer, hollow, ribs, seeds, skin: false, thick: 5, stem, group: i };
        };
        return { heap: false, pieces: [moved(half(0), -0.08, -24, 0, 0.85), moved(half(1), 0.1, 24, 2, 0.85)] };
      }
      /** A chili split lengthwise: the pod's outline with its pale seed core down the middle. */
      const n = 2;
      return {
        heap: false,
        pieces: Array.from({ length: n }, (_, i) => {
          const { line, outline } = chiliPod(60, 12, 0.12);
          const seeds = line.slice(2, 14).filter((_, j) => j % 1 === 0).map(([x, y]): Pt => [x + wob() * 0.8, y + wob() * 1.2]);
          return moved({ outer: outline, hollow: shrink(outline, 0.75), seeds, skin: false, thick: 2, group: i }, (i ? Math.PI : 0) + wob() * 0.08, 0, (i - 0.5) * 16);
        }),
      };
    }
    case "rings": {
      if (bell) {
        const n = 6;
        return { heap: false, pieces: Array.from({ length: n }, (_, i) => ({ ...moved(bellRing(20, seed + i), wob() * 0.4, (i - 2.5) * 13 + wob() * 2, wob() * 3 + Math.abs(i - 2.5) * 1.5), group: i })) };
      }
      /** Little chili rings, a few seeds caught in each. */
      const n = 26;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const r = 3.2 + rand() * 0.8;
          const outer = sampleClosed(ring(0, 0, r, r * 0.95, seed + i, 0.05, 9), 3);
          const seeds = Array.from({ length: 1 + Math.floor(rand() * 3) }, (): Pt => [wob() * r * 0.4, wob() * r * 0.4]);
          const [x, y] = golden(i, n, 22, 14);
          return { ...moved({ outer, hollow: shrink(outer, 0.62), seeds, skin: false, thick: 0.8, group: i }, rand() * 6.28, x, y), group: i };
        }),
      };
    }
    case "strips": {
      /** Lengthwise slivers of the wall, curved as the pepper was, glossy skin up. */
      const n = bell ? 18 : 22;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const len = bell ? 32 + rand() * 6 : 22 + rand() * 6;
          const w = bell ? 3.2 : 1.6;
          const curve = 0.15 + rand() * 0.15;
          const mid = Array.from({ length: 9 }, (_, j): Pt => {
            const t = j / 8 - 0.5;
            return [t * len, -curve * len * (1 - 4 * t * t) * 0.5];
          });
          const outer = [...mid.map(([x, y]): Pt => [x, y - w / 2]), ...mid.reverse().map(([x, y]): Pt => [x, y + w / 2])];
          const [x, y] = golden(i, n, 20, 13);
          return { ...moved({ outer, skin: true, thick: 1.4, group: i }, rand() * 6.28, x, y), group: i };
        }),
      };
    }
    case "quarters": {
      /** A bell pepper quartered: curved boats of wall, each with a pale rib down the inside. */
      return {
        heap: false,
        pieces: Array.from({ length: 4 }, (_, i) => {
          const len = 44;
          const outer = Array.from({ length: 24 }, (_, j): Pt => {
            const a = (j / 24) * Math.PI * 2;
            return [Math.cos(a) * len * 0.5, Math.sin(a) * 9 * (1 + 0.1 * Math.cos(3 * a))];
          });
          const ribs = [[[-len * 0.35, 0], [0, 1.5], [len * 0.35, 0]] as Pt[]];
          const [col, row] = [i % 2, Math.floor(i / 2)];
          return { ...moved({ outer, hollow: shrink(outer, 0.72), ribs, skin: false, thick: 6, group: i }, (col ? 0.25 : -0.25) + wob() * 0.1, (col - 0.5) * 50, (row - 0.5) * 26), group: i };
        }),
      };
    }
    case "diced":
    case "minced": {
      const fine = PEPPER_CUT[shape][cut] === "minced";
      const n = fine ? 90 : 44;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i) => {
          const s = fine ? (bell ? 1.4 : 1.1) + rand() * 0.6 : 3.4 + rand() * 0.8;
          const [x, y] = golden(i, n, fine ? 18 : 23, fine ? 11 : 14);
          /** Minced chili brings its seeds along. */
          const seedy = !bell && rand() < 0.25;
          const outer = sampleClosed(ring(0, 0, seedy ? s * 0.5 : s, seedy ? s * 0.35 : s * 0.85, seed + i * 3, 0.2, seedy ? 6 : 4), 2);
          return { ...moved({ outer, seeds: seedy ? [[0, 0]] : undefined, skin: !seedy && rand() < 0.75, thick: fine ? 0.6 : 1.4, group: i }, rand() * 6.28, x, y), group: i };
        }),
      };
    }
  }
}

/** The piece a scene would scatter: one ring, strip, half or quarter, or a few dice. */
export function representativePepper(result: PepperCutResult, shape: PepperShape, cut: Exclude<Cut, "whole">): PepperPiece[] {
  const pc = PEPPER_CUT[shape][cut];
  if (pc === "diced" || pc === "minced" || (pc === "rings" && shape === "chili")) {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: PepperPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, pc === "minced" ? 10 : 4);
  }
  const size = (p: PepperPiece) => bbox(p.outer).w * bbox(p.outer).h;
  return [result.pieces.reduce((a, b) => (size(b) > size(a) ? b : a))];
}

/** Cooked pepper slumps a little as it softens. */
export function softenPepper(p: PepperPiece): PepperPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.92, cy + (y - cy) * 0.88]);
  return { ...p, outer: s(p.outer), hollow: p.hollow && s(p.hollow), ribs: p.ribs?.map(s), seeds: p.seeds && s(p.seeds), stem: p.stem && s(p.stem), thick: p.thick * 0.7 };
}

export function framePepper(shape: PepperShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutPepper(shape, cut, seed);
  const picked = layout === "piece" ? representativePepper(result, shape, cut) : result.pieces;
  const drawn = cooked ? picked.map(softenPepper) : picked;
  return { result, ...frameCut(drawn, layout === "piece" ? 6 : 1.5, drawn.flatMap((p) => p.stem ?? [])) };
}
