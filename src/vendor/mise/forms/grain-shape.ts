import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { inside } from "../core/geometry";
import { heapOutline } from "../core/heap";
import { rng, type Pt } from "../core/rough";

/**
 * Rice: long grains with tapered ends. Lentil: little lenses, tipped at every angle. Seed: sesame's flat teardrops.
 * Kernel: corn, plump wedges with a glossy crown and a pale tip.
 */
export type GrainShape = "rice" | "lentil" | "seed" | "kernel";

export interface GrainProps extends ArtProps {
  color: string;
  shape?: GrainShape;
  /**
   * A second colour: the chalky heart of raw rice, the pale inside a cooked lentil shows where its skin splits,
   * the cream tip of a corn kernel.
   */
  accent?: string;
  /** Grains have no cuts. Taken so every form shares the same props, then ignored. */
  cut?: Cut;
  /** pile: a heap on the counter. piece: a few loose grains, enlarged, for scenes that scatter many. */
  layout?: Layout;
  /** Cooked: rice swells soft and white, lentils darken and split, corn turns bright and juicy. */
  cooked?: boolean;
  /** Colour once cooked, before any browning, as red lentils going golden. */
  cookedColor?: string;
  /** 0 is just boiled or steamed, 0.5 golden (fried rice, toasted sesame), 1 scorched and charred. */
  browning?: number;
  seed?: number;
}

export interface Item {
  at: Pt;
  len: number;
  wid: number;
  /** Degrees. */
  rot: number;
  /** -1 to 1: how much lighter or darker this grain is than the rest. */
  tone: number;
  /** 0 to 1, used for whatever varies grain to grain: how far a lentil is tipped, whether it split, a browned spot. */
  a: number;
  b: number;
}

export interface GrainGeometry {
  outline: Pt[] | null;
  peak: Pt;
  base: { cx: number; cy: number; rx: number; ry: number };
  /** Grains on the heap, back to front. */
  items: Item[];
  /** Grains fallen round its foot, or the whole of a few loose grains. */
  spill: Item[];
}

/** Length and width of one raw grain, in box units. */
export const SIZE: Record<GrainShape, [number, number]> = {
  rice: [5.4, 1.9],
  lentil: [4.2, 4.2],
  seed: [3.2, 1.9],
  kernel: [4.4, 4],
};
/** Cooking swells rice most, lentils a little, and corn a touch; seeds stay as they are. */
export const SWELL: Record<GrainShape, [number, number]> = {
  rice: [1.22, 1.45],
  lentil: [1.12, 1.12],
  seed: [1, 1],
  kernel: [1.08, 1.1],
};
const HEIGHT: Record<GrainShape, number> = { rice: 26, lentil: 23, seed: 26, kernel: 25 };
const COUNT: Record<GrainShape, { heap: number; spill: number; few: number; zoom: number }> = {
  rice: { heap: 400, spill: 22, few: 7, zoom: 3.4 },
  lentil: { heap: 190, spill: 16, few: 6, zoom: 3.2 },
  seed: { heap: 420, spill: 36, few: 11, zoom: 3.6 },
  kernel: { heap: 150, spill: 10, few: 5, zoom: 3 },
};

const byDepth = (a: Item, b: Item) => a.at[1] - b.at[1];

export function grainGeometry(shape: GrainShape, seed: number, layout: Layout = "pile", swollen = false): GrainGeometry {
  const rand = rng(seed * 37 + 3);
  const [len, wid] = SIZE[shape];
  const [sl, sw] = swollen ? SWELL[shape] : [1, 1];
  const count = COUNT[shape];
  const item = (at: Pt, zoom = 1): Item => {
    const k = (0.85 + rand() * 0.3) * zoom;
    return { at, len: len * sl * k, wid: wid * sw * k, rot: rand() * 360, tone: rand() * 2 - 1, a: rand(), b: rand() };
  };

  if (layout === "piece") {
    /** A few grains landed near each other, none on top of another. */
    const few: Item[] = [];
    const gap = len * count.zoom * 0.95;
    for (let tries = 0; few.length < count.few && tries < 400; tries++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      const p: Pt = [50 + Math.cos(a) * r * 28, 52 + Math.sin(a) * r * 18];
      if (few.every((f) => Math.hypot(f.at[0] - p[0], (f.at[1] - p[1]) * 1.3) > gap)) few.push(item(p, count.zoom));
    }
    return { outline: null, peak: [50, 52], base: { cx: 50, cy: 52, rx: 30, ry: 20 }, items: [], spill: few.sort(byDepth) };
  }

  const cx = 50 + (rand() * 2 - 1) * 2;
  const [cy, rx, ry] = [70, 33, 9.5];
  const H = HEIGHT[shape] + (swollen && shape === "rice" ? 3 : 0);
  const px = cx + (rand() * 2 - 1) * 5;
  const { top, outline } = heapOutline(rand, { cx, cy, rx, ry, height: H, px, bump: 0.8 });

  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const items: Item[] = [];
  for (let tries = 0; items.length < count.heap && tries < count.heap * 30; tries++) {
    const p: Pt = [l + rand() * (r - l), t + rand() * (b - t)];
    if (inside(p, outline)) items.push(item(p));
  }
  /** Grains along the top stand proud of the silhouette, so the heap's edge is made of grains. */
  for (const [x, y] of top.slice(1, -1)) items.push(item([x + (rand() - 0.5) * len * 0.4, y + len * 0.15]));
  items.sort(byDepth);

  const spill: Item[] = [];
  for (let tries = 0; spill.length < count.spill && tries < count.spill * 30; tries++) {
    const a = rand() * Math.PI * 2;
    const k = 1.02 + rand() ** 2 * 0.3;
    const p: Pt = [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * 1.3 * k];
    if (!inside(p, outline)) spill.push(item(p));
  }
  spill.sort(byDepth);

  return { outline, peak: [px, cy - ry - H], base: { cx, cy, rx, ry }, items, spill };
}
