import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/** Bell: a blocky, glossy pepper with three or four lobes and a thick green stem. Chili: a long tapering pod. */
export type PepperShape = "bell" | "chili";

export interface PepperProps extends ArtProps {
  /** The skin: red, green, yellow, orange. */
  color: string;
  shape?: PepperShape;
  /**
   * Halved shows the hollow inside, its pale ribs and seeds; rings (and sliced) cut across; strips cut lengthwise; wedges
   * quarter a bell pepper (halve a chili); diced and minced chop it.
   */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: the skin softens, deepens and blisters black in patches. */
  cooked?: boolean;
  cookedColor?: string;
  /** 0 just softened, 0.5 blistered, 1 charred all over, as when roasted on a flame. */
  browning?: number;
  seed?: number;
}

export const STEM = "#4f7a2a";
export const SEED = "#f2e6b8";

/** A bell pepper seen side on: broad shoulders dimpled where the stem sits, and lobes along the bottom. */
export function bellOutline(cx: number, cy: number, rx: number, ry: number, seed: number, n = 72): Pt[] {
  const rand = rng(seed * 29 + 3);
  const lean = (rand() - 0.5) * 0.08;
  return Array.from({ length: n }, (_, i): Pt => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const below = Math.max(0, Math.sin(a));
    let k = 1 + 0.05 * Math.abs(Math.cos(2 * a)) - 0.03;
    /** The bottom is broad and flattish, with four low lobes, not a point. */
    const fromBottom = a - Math.PI / 2;
    k -= 0.13 * below ** 3 * Math.exp(-((fromBottom / 0.7) ** 2));
    k += 0.045 * below ** 2 * Math.cos(8 * fromBottom + Math.PI);
    k -= 0.1 * Math.exp(-(((a + Math.PI / 2) / 0.28) ** 2));
    const x = Math.cos(a) * rx * k * (1 - 0.1 * below);
    const y = Math.sin(a) * ry * k;
    return [cx + x + y * lean, cy + y];
  });
}

/** A chili pod from its stem end at (0, 0) to the tip, bowed, as a centre line and an outline. */
export function chiliPod(len: number, w: number, bow: number): { line: Pt[]; outline: Pt[] } {
  const N = 24;
  const line = Array.from({ length: N + 1 }, (_, i): Pt => {
    const t = i / N;
    return [len * t, bow * len * Math.sin(Math.PI * t * 0.9) * t];
  });
  const width = (t: number) => (w / 2) * Math.min(1, 0.75 + t * 4) * (1 - t ** 1.7) + 0.3;
  const side = (s: number) =>
    line.map(([x, y], i): Pt => {
      const [a, b] = [line[Math.max(0, i - 1)]!, line[Math.min(N, i + 1)]!];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ww = width(i / N);
      return [x - ((b[1] - a[1]) / L) * ww * s, y + ((b[0] - a[0]) / L) * ww * s];
    });
  return { line, outline: [...side(1), ...side(-1).reverse()] };
}

export interface PepperGeometry {
  outline: Pt[];
  /** Grooves between the lobes, or along a chili. */
  creases: Pt[][];
  stem: Pt[];
  /** The green cap the stem grows from. */
  calyx: Pt[];
  highlight: Pt[];
}

/** A whole pepper fitted to the box. */
export function pepperGeometry(shape: PepperShape, seed: number): PepperGeometry {
  const rand = rng(seed * 37 + 11);
  if (shape === "bell") {
    const outline = bellOutline(50, 56, 34, 34, seed);
    const creases = [-0.36, 0.36].map((f) =>
      Array.from({ length: 7 }, (_, i): Pt => {
        const t = i / 6;
        return [50 + f * 34 * (0.75 + 0.25 * Math.sin(Math.PI * t)), 30 + t * 56];
      }),
    );
    const lean = (rand() - 0.5) * 8;
    const stem: Pt[] = [
      [47, 27],
      [46 + lean * 0.3, 17],
      [50 + lean, 9],
      [55 + lean, 10],
      [53 + lean * 0.4, 18],
      [54, 27],
    ];
    const calyx = Array.from({ length: 10 }, (_, i): Pt => {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 ? 6 : 10;
      return [50.5 + Math.cos(a) * r, 27 + Math.sin(a) * r * 0.35];
    });
    const highlight: Pt[] = [
      [34, 38],
      [31, 50],
      [32, 64],
    ];
    return { outline, creases, stem, calyx, highlight };
  }
  const bow = 0.12 + rand() * 0.08;
  const { line, outline } = chiliPod(80, 15, bow);
  const tilt = -0.18;
  const place = (pts: Pt[]) => pts.map(([x, y]): Pt => [14 + x * Math.cos(tilt) - y * Math.sin(tilt), 50 + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  const stem = place([
    [-2, -1.5],
    [-8, -3],
    [-12, -8],
    [-10, -9],
    [-6, -5],
    [-2, 1.5],
  ]);
  const calyx = place(Array.from({ length: 10 }, (_, i): Pt => {
    const a = (i / 10) * Math.PI * 2;
    return [2 + Math.cos(a) * 3.5, Math.sin(a) * 8 * (i % 2 ? 0.75 : 1)];
  }));
  return {
    outline: place(outline),
    creases: [place(line.slice(3, 18).map(([x, y]): Pt => [x, y + 2]))],
    stem,
    calyx,
    highlight: place(line.slice(4, 14).map(([x, y]): Pt => [x, y - 3.5])),
  };
}
