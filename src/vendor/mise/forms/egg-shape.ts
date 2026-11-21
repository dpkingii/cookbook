import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/**
 * Which egg. `shell`: whole in its shell. `cracked`: broken out onto the counter or into the pan, a pool of white round a
 * domed yolk (cooked, it is a fried egg). `beaten`: whisked yellow (cooked and cut, it is scrambled curds, omelette strips
 * or fine bits; cooked whole, a folded omelette). `boiled`: peeled after boiling, to halve, slice, quarter or chop.
 */
export type EggState = "shell" | "cracked" | "beaten" | "boiled";

export interface EggProps extends ArtProps {
  /** The shell's colour: brown, white, or speckled for a quail egg. */
  color?: string;
  yolk?: string;
  state?: EggState;
  /** A boiled egg with a soft, jammy yolk rather than a firm, pale one. */
  soft?: boolean;
  /**
   * On a boiled egg: halved, sliced (and rings), wedges (quarters), diced (chopped) and minced (grated); strips slice it
   * too. On beaten egg: diced, halved and wedges are scrambled curds, sliced, strips and rings are omelette ribbons, minced
   * is fine bits as in fried rice. A cracked egg has no cuts.
   */
  cut?: Cut;
  layout?: Layout;
  /**
   * Cooked: a cracked egg fries, its white set and lacy at the edge; beaten egg sets golden; a boiled egg takes on
   * `cookedColor`, as a soy-braised or tea egg does.
   */
  cooked?: boolean;
  cookedColor?: string;
  /** 0 is just set, 0.5 golden where it met the pan, 1 crisp and brown. */
  browning?: number;
  seed?: number;
}

export const SHELL = "#d9a877";
export const YOLK = "#f5b21f";
export const WHITE_EGG = "#fbf8ef";

/** An egg lying on its side, pointed end to the left: wider toward the blunt end on the right. */
export function eggOutline(cx: number, cy: number, L: number, W: number, seed = 1, n = 48): Pt[] {
  const rand = rng(seed * 19 + 7);
  const wob = 0.008;
  return Array.from({ length: n }, (_, i): Pt => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * wob;
    return [cx + Math.cos(a) * (L / 2) * k, cy + Math.sin(a) * (W / 2) * (1 + 0.13 * Math.cos(a)) * k];
  });
}

/** An irregular round blob, as a pool of egg white, a curd or a yolk. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, wobble: number, n = 40): Pt[] {
  const rand = rng(seed * 23 + 5);
  const waves = [2, 3, 5, 7].map((k) => ({ k, a: (wobble * (0.5 + rand())) / Math.sqrt(k), ph: rand() * 6.28 }));
  return Array.from({ length: n }, (_, i): Pt => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + waves.reduce((s, w) => s + w.a * Math.sin(w.k * a + w.ph), 0);
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
}

/** A whole egg, fitted to the box: the shell (or a peeled boiled egg), lying slightly turned. */
export function shellGeometry(seed: number): { outline: Pt[] } {
  const rand = rng(seed * 31 + 1);
  const tilt = (-8 + (rand() - 0.5) * 8) * (Math.PI / 180);
  const pts = eggOutline(0, 0, 80, 60, seed).map(([x, y]): Pt => [50 + x * Math.cos(tilt) - y * Math.sin(tilt), 50 + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  return { outline: pts };
}

/** A cracked egg: the white spread in a rough round, the thick white standing up round the yolk, and the yolk itself. */
export function crackedGeometry(seed: number): { white: Pt[]; thick: Pt[]; yolk: Pt[]; yolkAt: Pt; yolkR: number } {
  const rand = rng(seed * 37 + 3);
  const yolkAt: Pt = [44 + rand() * 8, 46 + rand() * 6];
  const yolkR = 15;
  return {
    white: blob(50, 50, 37, 33, seed, 0.12, 56),
    thick: blob(yolkAt[0] + 3, yolkAt[1] + 2, 28, 23, seed + 9, 0.1, 40),
    yolk: blob(yolkAt[0], yolkAt[1], yolkR, yolkR * 0.92, seed + 4, 0.015, 32),
    yolkAt,
    yolkR,
  };
}

/** Beaten egg poured out, or a folded omelette when cooked whole. */
export function beatenGeometry(seed: number): { pool: Pt[]; streaks: Pt[][] } {
  const rand = rng(seed * 41 + 9);
  const pool = blob(50, 52, 44, 34, seed, 0.1, 56);
  /** Wisps of white not quite whisked in: short, curved, scattered across the pool. */
  const streaks = Array.from({ length: 7 }, () => {
    const [x0, y0] = [22 + rand() * 50, 34 + rand() * 34];
    const a0 = rand() * 6.28;
    const len = 6 + rand() * 9;
    const bend = (rand() - 0.5) * 1.6;
    return Array.from({ length: 6 }, (_, i): Pt => {
      const t = i / 5;
      const a = a0 + bend * t;
      return [x0 + Math.cos(a) * len * t, y0 + Math.sin(a) * len * t * 0.7];
    });
  });
  return { pool, streaks };
}

/** An omelette folded in half: a half-moon, its straight fold edge toward the viewer. */
export function omeletteGeometry(seed: number): { outline: Pt[]; fold: Pt[] } {
  const rand = rng(seed * 43 + 1);
  const n = 40;
  const arc = Array.from({ length: n + 1 }, (_, i): Pt => {
    const a = Math.PI + (i / n) * Math.PI;
    const k = 1 + (rand() - 0.5) * 0.03;
    return [50 + Math.cos(a) * 44 * k, 62 + Math.sin(a) * 36 * k];
  });
  const fold = Array.from({ length: 9 }, (_, i): Pt => [94 - (i / 8) * 88, 62 + Math.sin((i / 8) * Math.PI) * 6]);
  return { outline: [...arc, ...fold.slice(1, -1)], fold };
}
