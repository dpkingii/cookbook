import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { inside } from "../core/geometry";
import { heapOutline } from "../core/heap";
import { rng, type Pt } from "../core/rough";

/**
 * Powder: flour, starch, icing sugar and ground spices, a soft heap. Crystal: salt, glinting grains that keep their
 * colour in the pan. Sugar: like salt, but it melts to caramel when cooked. Flakes: chili flakes and dried herbs.
 * Cracked: black pepper and other coarse-ground spices, angular chunks with paler broken faces.
 */
export type DustShape = "powder" | "crystal" | "sugar" | "flakes" | "cracked";

export interface DustProps extends ArtProps {
  color: string;
  shape?: DustShape;
  /** A second colour mixed through: chili seeds among the flakes, the pale husk in cracked pepper. */
  speckle?: string;
  /** Dry goods have no cuts. Taken so every form shares the same props, then ignored. */
  cut?: Cut;
  /** pile: a heap on the counter. piece: a pinch sprinkled out, for scenes that scatter many. */
  layout?: Layout;
  /** Cooked: toasted, golden then brown. Sugar melts into caramel instead, and salt barely changes. */
  cooked?: boolean;
  /** Where the toasting heads, in place of golden brown. */
  cookedColor?: string;
  /** 0 is just warm, 0.5 golden (a blond roux, sugar half melted), 1 burnt and smoking. */
  browning?: number;
  seed?: number;
}

export interface Grain {
  at: Pt;
  size: number;
  rot: number;
  /** -1 to 1: how much lighter or darker this grain is than the rest. */
  tone: number;
  /** Drawn in the speckle colour, when there is one. */
  odd: boolean;
}

export interface DustGeometry {
  /** The heap's silhouette, or null for a pinch. */
  outline: Pt[] | null;
  peak: Pt;
  base: { cx: number; cy: number; rx: number; ry: number };
  /** Grains on the heap, back to front. */
  grains: Grain[];
  /** Grains fallen round the heap's foot, or the whole of a pinch. */
  spill: Grain[];
}

/** Heaps of fine powder stand steepest; coarse grains roll and slump lower. */
const HEIGHT: Record<DustShape, number> = { powder: 35, crystal: 29, sugar: 30, flakes: 31, cracked: 29 };
const SIZE: Record<DustShape, [number, number]> = {
  powder: [0.22, 0.5],
  crystal: [0.8, 1.5],
  sugar: [0.6, 1.15],
  flakes: [2.6, 4.4],
  cracked: [0.9, 2.2],
};
const COUNT: Record<DustShape, { heap: number; spill: number; pinch: number; zoom: number }> = {
  powder: { heap: 0, spill: 90, pinch: 170, zoom: 2.6 },
  crystal: { heap: 170, spill: 40, pinch: 30, zoom: 3.6 },
  sugar: { heap: 200, spill: 40, pinch: 36, zoom: 3.6 },
  flakes: { heap: 130, spill: 18, pinch: 14, zoom: 2.2 },
  cracked: { heap: 230, spill: 40, pinch: 26, zoom: 3.6 },
};

const byDepth = (a: Grain, b: Grain) => a.at[1] - b.at[1];

/** A heap of it on the counter, or a pinch sprinkled out. `slump` (0 to 1) flattens the heap, as sugar melting. */
export function dustGeometry(shape: DustShape, seed: number, layout: Layout = "pile", slump = 0): DustGeometry {
  const rand = rng(seed * 43 + 11);
  const [lo, hi] = SIZE[shape];
  const count = COUNT[shape];
  const grain = (at: Pt, zoom = 1): Grain => ({
    at,
    size: (lo + rand() * (hi - lo)) * zoom,
    rot: rand() * Math.PI,
    tone: rand() * 2 - 1,
    odd: rand() < 0.22,
  });

  if (layout === "piece") {
    /** Thick in the middle and thinning out, as a pinch lands. */
    const spill = Array.from({ length: count.pinch }, () => {
      const a = rand() * Math.PI * 2;
      const r = rand() ** 0.7;
      return grain([50 + Math.cos(a) * r * 32, 52 + Math.sin(a) * r * 20], count.zoom);
    }).sort(byDepth);
    return { outline: null, peak: [50, 52], base: { cx: 50, cy: 52, rx: 32, ry: 20 }, grains: [], spill };
  }

  const cx = 50 + (rand() * 2 - 1) * 2;
  const cy = 70 - slump * 6;
  const rx = 34 * (1 + slump * 0.15);
  const ry = 9.5 * (1 + slump * 0.15);
  const H = HEIGHT[shape] * (1 - slump * 0.8);
  const px = cx + (rand() * 2 - 1) * 5;
  const bump = shape === "powder" ? 0.6 : shape === "flakes" ? 1.4 : 0.9;
  const { top, outline } = heapOutline(rand, { cx, cy, rx, ry, height: H, px, bump });

  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const grains: Grain[] = [];
  for (let tries = 0; grains.length < count.heap && tries < count.heap * 30; tries++) {
    const p: Pt = [l + rand() * (r - l), t + rand() * (b - t)];
    if (inside(p, outline)) grains.push(grain(p));
  }
  /** Grains along the top stand proud of the silhouette, so a coarse heap has a broken edge. */
  if (count.heap)
    for (const [x, y] of top.slice(1, -1)) grains.push(grain([x + (rand() - 0.5) * hi, y + (rand() - 0.3) * hi * 0.8]));
  grains.sort(byDepth);

  const spill: Grain[] = [];
  for (let tries = 0; spill.length < count.spill && tries < count.spill * 30; tries++) {
    const a = rand() * Math.PI * 2;
    const k = 1 + rand() ** 2 * 0.3;
    const p: Pt = [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * 1.25 * k];
    if (!inside(p, outline)) spill.push(grain(p));
  }
  spill.sort(byDepth);

  return { outline, peak: [px, cy - ry - H], base: { cx, cy, rx, ry }, grains, spill };
}
