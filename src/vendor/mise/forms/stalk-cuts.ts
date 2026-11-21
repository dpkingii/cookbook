import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { along, band, line, outlineOf, type StalkShape } from "./stalk-shape";

/** What cooks do with stalks: rings straight across, slices on the bias, fine shreds, and lengths for wedges. */
export type StalkCut = "halved" | "rings" | "bias" | "shreds" | "diced" | "minced" | "lengths";

export const STALK_CUT: Record<Exclude<Cut, "whole">, StalkCut> = {
  halved: "halved",
  rings: "rings",
  sliced: "bias",
  strips: "shreds",
  diced: "diced",
  minced: "minced",
  wedges: "lengths",
};

export interface StalkPiece {
  outer: Pt[];
  /** The hollow in a scallion's green ring. */
  hole?: Pt[];
  /** Layers seen across a cut face, as closed lines. */
  rings?: Pt[][];
  /** Layers along a split stalk, or veins and ridges along its skin. */
  lines?: Pt[][];
  /** Celery's strings, seen end-on. */
  dots?: Pt[];
  /** The cut end of a length, showing its pale face. */
  cap?: Pt[];
  /** Light and shade along a round length. */
  shine?: Pt[];
  shade?: Pt[];
  thick: number;
  /** Where along the stalk the piece came from: 0 pale root, 1 green tip. */
  tone: number;
  /** A long piece fades from `tone` to `toneTo` along `axis`. */
  toneTo?: number;
  axis?: [Pt, Pt];
  /** A cut face (pale flesh and layers) or the skin. */
  face: "section" | "skin";
}

export interface StalkCutResult {
  pieces: StalkPiece[];
  heap: boolean;
}

type Shape = Omit<StalkPiece, "thick" | "tone" | "toneTo" | "face">;

function moved(shape: Shape, rot: number, x: number, y: number, squash = 0.8): Shape {
  const [cx, cy] = centroid(shape.outer);
  const go = (p: Pt[]) => layFlat(p.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return {
    outer: go(shape.outer),
    hole: shape.hole && go(shape.hole),
    rings: shape.rings?.map(go),
    lines: shape.lines?.map(go),
    dots: shape.dots && go(shape.dots),
    cap: shape.cap && go(shape.cap),
    shine: shape.shine && go(shape.shine),
    shade: shape.shade && go(shape.shade),
    axis: shape.axis && (go(shape.axis) as [Pt, Pt]),
  };
}

const stretch = (p: Pt[], k: number) => p.map(([x, y]): Pt => [x * k, y]);

/** A slice across the stalk: hollow for scallion greens, layered for leek and lemongrass, a U for celery. */
function section(shape: StalkShape, tone: number, r: number, seed: number, long = 1): Shape {
  const rand = rng(seed * 7 + 3);
  const round = sampleClosed(ring(0, 0, r, r * (0.9 + rand() * 0.08), seed, 0.05, 10), 3);
  const scaled = (k: number, dx = 0) => round.map(([x, y]): Pt => [x * k + dx * r, y * k]);
  switch (shape) {
    case "scallion":
      return tone > 0.5
        ? { outer: stretch(round, long), hole: stretch(scaled(0.66, 0.04), long) }
        : { outer: stretch(round, long), rings: [stretch(scaled(0.68), long), stretch(scaled(0.38, 0.05), long)] };
    case "leek":
    case "lemongrass": {
      const step = shape === "leek" ? 0.16 : 0.13;
      const rings = Array.from({ length: Math.floor(0.85 / step) }, (_, k) => stretch(scaled(1 - (k + 1) * step, (k + 1) * 0.018), long));
      return { outer: stretch(round, long), rings };
    }
    case "celery": {
      const bumps = rand() * 6;
      const bottom = Array.from({ length: 19 }, (_, i): Pt => {
        const th = (i / 18) * Math.PI;
        const k = 1 + 0.045 * Math.cos(12 * th + bumps);
        return [Math.cos(th) * r * k, Math.sin(th) * r * 0.78 * k];
      });
      const top = Array.from({ length: 9 }, (_, i): Pt => {
        const x = -r + (2 * r * (i + 1)) / 10;
        return [x, r * 0.34 * (1 - (x / r) ** 2) - r * 0.05];
      });
      const dots = Array.from({ length: 7 }, (_, i): Pt => {
        const th = ((i + 0.5) / 7) * Math.PI;
        return [Math.cos(th) * r * 0.84, Math.sin(th) * r * 0.66];
      });
      const inner = bottom.slice(2, 17).map(([x, y]): Pt => [x * 0.9, y * 0.88]);
      return { outer: stretch([...bottom, ...top], long), dots: stretch(dots, long), lines: [stretch(inner, long)] };
    }
  }
}

/** A straight length of stalk, skin up: rounded with a shine, ridged or veined, its cut end showing. */
function length(shape: StalkShape, l: number, w: number, bend: number, seed: number, end = true): Shape {
  const spine = line([-l / 2, 0], 0, l, bend, 0, 14);
  const widths = spine.map(() => w);
  const ridges = shape === "celery" ? [-0.66, -0.33, 0, 0.33, 0.66] : [-0.4, 0.05, 0.45];
  const last = spine[spine.length - 1]!;
  const cap = end
    ? sampleClosed(ring(last[0], last[1], Math.max(0.6, w * 0.16), w * 0.48, seed, 0.02, 8), 2)
    : undefined;
  return {
    outer: outlineOf(spine, widths, "flat", "flat"),
    lines: ridges.map((s) => along(spine, widths, s, 0.02, end ? 0.92 : 0.98)),
    shine: band(spine, widths, -0.75, -0.25),
    shade: band(spine, widths, 0.35, 1),
    cap,
    axis: [spine[0]!, last],
  };
}

/** A stalk split lengthwise and laid cut side up, its layers running its length and meeting at the root. */
function split(shape: StalkShape, l: number, w: number, seed: number): Shape {
  const rand = rng(seed * 11 + 5);
  const spine = line([-l / 2, 0], 0, l, (rand() * 2 - 1) * 1.5, 0, 22);
  const bulb = shape === "scallion" ? 1.6 : shape === "lemongrass" ? 1.3 : 1.06;
  const widths = spine.map((_, i) => {
    const t = i / (spine.length - 1);
    return w * (1 + (bulb - 1) * Math.exp(-(((t - 0.08) / 0.1) ** 2)) - 0.18 * t);
  });
  const layers = shape === "leek" ? 5 : shape === "lemongrass" ? 4 : 2;
  const lines = Array.from({ length: layers * 2 }, (_, k) => {
    const s = (k % 2 ? 1 : -1) * (1 - (Math.floor(k / 2) + 1) / (layers + 1));
    return along(spine, widths, s * 0.94, 0.03, 1).map(([x, y], i, all): Pt => {
      const t = i / (all.length - 1);
      const c = spine[Math.round(0.03 * (spine.length - 1) + t * 0.97 * (spine.length - 1))]!;
      /** Layers fold together at the root plate. */
      const pull = Math.min(1, t / 0.07);
      return [c[0] + (x - c[0]) * pull, c[1] + (y - c[1]) * pull];
    });
  });
  const root = spine[0]!;
  const cap = sampleClosed(ring(root[0] + 0.8, root[1], 1.4, widths[0]! * 0.46, seed, 0.03, 8), 2);
  return { outer: outlineOf(spine, widths, shape === "scallion" ? "round" : "flat", "flat"), lines, cap, axis: [root, spine[spine.length - 1]!] };
}

function square(s: number, seed: number, layered: boolean): Shape {
  const rand = rng(seed * 13 + 1);
  const j = () => (rand() * 2 - 1) * s * 0.08;
  const h = s / 2;
  const outer: Pt[] = [
    [-h + j(), -h + j()],
    [h + j(), -h + j()],
    [h + j(), h + j()],
    [-h + j(), h + j()],
  ];
  const y = (rand() * 2 - 1) * h * 0.4;
  return { outer, lines: layered ? [[[-h * 0.92, y], [h * 0.92, y + j()]]] : undefined };
}

const SIZE: Record<StalkShape, { r: number; n: number; w: number }> = {
  scallion: { r: 3.4, n: 34, w: 7 },
  leek: { r: 9, n: 8, w: 16 },
  celery: { r: 6.8, n: 13, w: 12 },
  lemongrass: { r: 4.2, n: 24, w: 9 },
};

export function cutStalk(shape: StalkShape, cut: Exclude<Cut, "whole">, seed: number): StalkCutResult {
  const rand = rng(seed * 41 + 9);
  const wob = () => rand() * 2 - 1;
  const size = SIZE[shape];
  /** Which part of the stalk a piece comes from: scallion uses all of it, leek and lemongrass the pale lower part. */
  const tone = () => {
    switch (shape) {
      case "scallion":
        return rand() < 0.42 ? 0.05 + rand() * 0.3 : 0.62 + rand() * 0.38;
      case "leek":
        return 0.05 + rand() * 0.55;
      case "celery":
        return 0.5 + rand() * 0.4;
      case "lemongrass":
        return 0.04 + rand() * 0.4;
    }
  };
  const scatter = (i: number, n: number, spread: number): Pt => {
    const a = i * 2.39996;
    const d = Math.sqrt((i + 0.5) / n);
    return [Math.cos(a) * spread * d, Math.sin(a) * spread * 0.66 * d];
  };

  switch (STALK_CUT[cut]) {
    case "rings":
    case "bias": {
      const long = STALK_CUT[cut] === "bias" ? (shape === "celery" ? 1.35 : 1.75) : 1;
      const spread = Math.sqrt(size.n) * size.r * (long > 1 ? 1.35 : 1.15);
      const pieces = Array.from({ length: size.n }, (_, i) => {
        const t = tone();
        const [x, y] = scatter(i, size.n, spread);
        const r = size.r * (0.88 + rand() * 0.2) * (shape === "leek" ? 0.85 + t * 0.3 : 1);
        return { ...moved(section(shape, t, r, seed + i, long), rand() * 6.28, x, y), thick: shape === "leek" ? 2.4 : 1.6, tone: t, face: "section" as const };
      });
      return { heap: size.r < 5, pieces };
    }
    case "halved": {
      if (shape === "celery") {
        return {
          heap: false,
          pieces: [0, 1].map((i) => ({
            ...moved(length(shape, 42, size.w, wob() * 1.5, seed + i), -0.15 + wob() * 0.08, i * 4, (i - 0.5) * size.w * 1.6),
            thick: size.w * 0.12,
            tone: 0.55 + i * 0.25,
            toneTo: 0.75 + i * 0.2,
            face: "skin" as const,
          })),
        };
      }
      const l = shape === "leek" ? 60 : 56;
      const w = shape === "scallion" ? 6 : shape === "leek" ? 16 : 9;
      const half = split(shape, l, w, seed);
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [x, -y]);
      const other: Shape = { ...half, outer: mirror(half.outer), lines: half.lines?.map(mirror), cap: half.cap && mirror(half.cap) };
      const to = shape === "scallion" ? 0.95 : shape === "leek" ? 0.7 : 0.55;
      return {
        heap: false,
        pieces: [half, other].map((h, i) => ({
          ...moved(h, -0.12 + wob() * 0.05, i * 3, (i - 0.5) * w * 1.7),
          thick: w * 0.16,
          tone: 0,
          toneTo: to,
          face: "section" as const,
        })),
      };
    }
    case "lengths": {
      const n = { scallion: 8, leek: 4, celery: 5, lemongrass: 4 }[shape];
      const l = { scallion: 24, leek: 22, celery: 28, lemongrass: 26 }[shape];
      const pieces = Array.from({ length: n }, (_, i) => {
        const t = shape === "scallion" ? i / (n - 1) : tone();
        const w = size.w * (0.92 + rand() * 0.12) * (shape === "scallion" && t > 0.6 ? 0.8 : 1);
        /** Two loose rows, the way lengths fall off the knife. */
        const [col, row] = [i % 2, Math.floor(i / 2)];
        const rows = Math.ceil(n / 2);
        return {
          ...moved(
            length(shape, l * (0.92 + rand() * 0.14), w, wob() * 0.8, seed + i),
            -0.2 + wob() * 0.12,
            (col - 0.5) * l * 1.08 + wob() * 2 + row * 2,
            (row - (rows - 1) / 2) * size.w * 1.05 + col * size.w * 0.3,
          ),
          thick: w * 0.12,
          tone: t,
          face: "skin" as const,
        };
      });
      return { heap: false, pieces };
    }
    case "shreds": {
      const spec = {
        scallion: { n: 32, w: 1.4, l: 24, bend: 3.2 },
        leek: { n: 26, w: 1.8, l: 24, bend: 2 },
        celery: { n: 18, w: 2.6, l: 20, bend: 0.6 },
        lemongrass: { n: 26, w: 1.4, l: 20, bend: 1 },
      }[shape];
      const pieces = Array.from({ length: spec.n }, (_, i) => {
        const [x, y] = scatter(i, spec.n, 13);
        const t = shape === "scallion" ? (rand() < 0.75 ? 0.7 + rand() * 0.3 : 0.1 + rand() * 0.3) : tone();
        return {
          ...moved(length(shape, spec.l * (0.8 + rand() * 0.35), spec.w * (0.85 + rand() * 0.3), wob() * spec.bend, seed + i, false), 0.35 + wob() * 0.55, x, y),
          thick: spec.w * 0.3,
          tone: t,
          face: "skin" as const,
        };
      });
      return { heap: true, pieces };
    }
    case "diced":
    case "minced": {
      const fine = STALK_CUT[cut] === "minced";
      const n = fine ? 130 : shape === "scallion" ? 64 : 50;
      const spread = fine ? 20 : 26;
      const pieces = Array.from({ length: n }, (_, i) => {
        const t = tone();
        const [x, y] = scatter(i, n, spread);
        const s = fine ? 1 + rand() * 0.6 : shape === "lemongrass" ? 2.6 + rand() * 0.6 : 3.4 + rand() * 0.8;
        const shapeOf: Shape = fine
          ? { outer: sampleClosed(ring(0, 0, s, s * (0.6 + rand() * 0.4), seed + i * 3, 0.3, 5), 2) }
          : shape === "scallion"
            ? section(shape, t, 2.1 + rand() * 0.4, seed + i)
            : square(s, seed + i, shape !== "celery");
        return { ...moved(shapeOf, rand() * 6.28, x, y - (1 - Math.hypot(x, y) / spread) * 2), thick: fine ? 0.9 : 1.8, tone: t, face: "section" as const };
      });
      return { heap: true, pieces };
    }
  }
}

/** The piece a scene would scatter: the biggest one, or a small cluster of mince. */
export function representativeStalk(result: StalkCutResult, cut: Exclude<Cut, "whole">): StalkPiece[] {
  const area = (p: StalkPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  if (STALK_CUT[cut] === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: StalkPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 10);
  }
  return [result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a))];
}

/** Cooked pieces wilt and shrink a little. */
export function wiltStalk(p: StalkPiece): StalkPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * 0.9, cy + (y - cy) * 0.9]);
  return {
    ...p,
    outer: s(p.outer),
    hole: p.hole && s(p.hole),
    rings: p.rings?.map(s),
    lines: p.lines?.map(s),
    dots: p.dots && s(p.dots),
    cap: p.cap && s(p.cap),
    shine: p.shine && s(p.shine),
    shade: p.shade && s(p.shade),
    axis: p.axis && (s(p.axis) as [Pt, Pt]),
    thick: p.thick * 0.75,
  };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameStalk(shape: StalkShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutStalk(shape, cut, seed);
  const picked = layout === "piece" ? representativeStalk(result, cut) : result.pieces;
  return { result, ...frameCut(cooked ? picked.map(wiltStalk) : picked, layout === "piece" ? 6 : 1.5) };
}
