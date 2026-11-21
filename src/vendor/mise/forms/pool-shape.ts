import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/**
 * How a liquid sits on the counter. Thin: stock, wine, vinegar, soy, spreading flat with a ragged edge.
 * Oil: thinner still, clear and very glossy. Syrup: honey, hoisin, oyster sauce, standing up with poured folds.
 * Creamy: cream, milk, coconut milk, opaque and soft. Sauce: tomato sauce, pesto, thick enough to hold a spoon swirl.
 */
export type PoolShape = "thin" | "oil" | "syrup" | "creamy" | "sauce";

export interface PoolProps extends ArtProps {
  color: string;
  shape?: PoolShape;
  /** Bits in it: herbs, chili flakes, cracked pepper. */
  flecks?: string;
  /** Beads of fat floating on top, as on stock or a vinaigrette. */
  beads?: string;
  /** Liquids have no cuts. Taken so every form shares the same props, then ignored. */
  cut?: Cut;
  /** pile: a pool on the counter. piece: one drop, for scenes that scatter many, as oil in a pan. */
  layout?: Layout;
  /** Cooked: reduced, darker and glossier inside the tide mark it left. Oil instead shimmers with heat. */
  cooked?: boolean;
  /** Colour of the cooked liquid before it reduces further. */
  cookedColor?: string;
  /** 0 is just hot and simmering, 0.5 reduced by half, 1 scorched at the edges. Oil smokes past 0.55. */
  browning?: number;
  seed?: number;
}

/**
 * clarity: 0 is clear, 1 opaque. height: how far the liquid stands up off the counter, in box units.
 * spread: how ragged its edge runs. gloss: how sharp its reflections are. splash: stray drops round it.
 */
export interface Body {
  clarity: number;
  height: number;
  spread: number;
  gloss: number;
  splash: number;
}

export const BODY: Record<PoolShape, Body> = {
  thin: { clarity: 0.3, height: 0.8, spread: 0.15, gloss: 1, splash: 3 },
  oil: { clarity: 0.12, height: 0.6, spread: 0.11, gloss: 1.2, splash: 2 },
  syrup: { clarity: 0.55, height: 3.2, spread: 0.05, gloss: 1.1, splash: 0 },
  creamy: { clarity: 1, height: 1.8, spread: 0.08, gloss: 0.7, splash: 1 },
  sauce: { clarity: 1, height: 3, spread: 0.06, gloss: 0.75, splash: 0 },
};

/** Seen from a slant, a round pool on the counter is about this much shorter than it is wide. */
const SQUASH = 0.58;
const N = 56;

/** A rough unit circle: a few slow waves round its edge, and one lobe where the liquid ran further. */
function blob(rand: () => number, spread: number, n = N): Pt[] {
  const waves = [2, 3, 4, 5, 6, 8].map((k) => ({ k, a: (spread * (0.5 + rand() * 0.8)) / (k - 1) ** 0.7, ph: rand() * Math.PI * 2 }));
  const lobe = rand() * Math.PI * 2;
  const lobeSize = spread * (0.8 + rand() * 0.8);
  return Array.from({ length: n }, (_, i): Pt => {
    const th = (i / n) * Math.PI * 2;
    const d = Math.atan2(Math.sin(th - lobe), Math.cos(th - lobe));
    const r = 1 + waves.reduce((s, w) => s + w.a * Math.cos(w.k * th + w.ph), 0) + lobeSize * Math.exp(-((d / 0.4) ** 2));
    return [Math.cos(th) * r, Math.sin(th) * r];
  });
}

export interface PoolGeometry {
  /** Where the liquid is now. Points run round from the right, through the bottom, so a fixed index range is a fixed side. */
  surface: Pt[];
  /** The line it reached before it reduced, or null when it hasn't. */
  tide: Pt[] | null;
  /** Stray drops splashed round it. */
  drops: Pt[][];
  c: Pt;
  rx: number;
  ry: number;
  height: number;
}

/** The pool, or one drop of it, fitted to the box. `reduce` (0 to 1) pulls the surface in from where it was. */
export function poolGeometry(shape: PoolShape, seed: number, layout: Layout = "pile", reduce = 0): PoolGeometry {
  const body = BODY[shape];
  const rand = rng(seed * 71 + 5);
  const piece = layout === "piece";
  const stretch = 1 + rand() * 0.14;
  const raw = blob(rand, piece ? Math.min(body.spread, 0.045) : body.spread).map(([x, y]): Pt => [x * stretch, y * (piece ? 0.7 : SQUASH)]);
  const drops: Pt[][] = [];
  if (!piece) {
    const count = body.splash + (body.splash && rand() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const i0 = Math.floor(rand() * N);
      const [ex, ey] = raw[i0]!;
      const out = 1.1 + rand() * 0.22;
      const s = 0.035 + rand() * 0.05;
      drops.push(blob(rand, 0.06, 14).map(([x, y]): Pt => [ex * out + x * s, ey * out + y * s * 0.75]));
    }
  }

  /** A drop stands up in a dome; a pool only as far as the liquid is thick. Reducing thickens it. */
  const height = (piece ? (shape === "thin" || shape === "oil" ? 3 : 4.6) : body.height) + reduce * (piece ? 1.6 : 1.3);
  const all = [...raw, ...drops.flat()];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((piece ? 70 : 86) / (r - l), (piece ? 60 : 68) / (b - t) - height / (b - t));
  const fit = ([x, y]: Pt): Pt => [50 + (x - (l + r) / 2) * k, 50 - height / 2 + (y - (t + b) / 2) * k];

  /** Liquid draws back unevenly as it reduces, so the surface sits off-centre inside its old line. */
  const s = 1 - reduce * 0.24;
  const pull: Pt = [(rand() * 2 - 1) * (1 - s) * 0.35, (rand() * 2 - 1) * (1 - s) * 0.25];
  const surface = (reduce > 0 ? raw.map(([x, y]): Pt => [x * s + pull[0], y * s + pull[1]]) : raw).map(fit);
  const sx = surface.map((p) => p[0]);
  const sy = surface.map((p) => p[1]);
  const [sl, sr, st, sb] = [Math.min(...sx), Math.max(...sx), Math.min(...sy), Math.max(...sy)];
  return {
    surface,
    tide: reduce > 0 ? raw.map(fit) : null,
    drops: drops.map((d) => d.map(fit)),
    c: [(sl + sr) / 2, (st + sb) / 2],
    rx: (sr - sl) / 2,
    ry: (sb - st) / 2,
    height,
  };
}
