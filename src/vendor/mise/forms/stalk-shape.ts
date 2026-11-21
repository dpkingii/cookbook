import type { ArtProps } from "../core/Art";
import { mix } from "../core/color";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/**
 * Scallion: a slim white bulb with hollow leaves splitting off. Leek: a thick white shaft fanning into flat
 * blue-green leaves. Celery: one ridged rib with a sprig of leaves. Lemongrass: a woody, tapering stalk.
 */
export type StalkShape = "scallion" | "leek" | "celery" | "lemongrass";

export interface StalkProps extends ArtProps {
  /** Colour of the green part: leaves, or the upper stalk. */
  color: string;
  /** Colour near the root, where the stalk is pale. */
  base?: string;
  /** A tint near the root, as the purple on lemongrass or red scallions. */
  blush?: string;
  shape?: StalkShape;
  /** Rings are round; sliced is cut on the bias; strips are fine shreds; wedges cut it into lengths. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: wilted, the greens gone olive, browned as far as `browning` says. Whole, it is grilled with char marks. */
  cooked?: boolean;
  /** Colour of the cooked greens before any browning. */
  cookedColor?: string;
  /** 0 is just wilted, 0.5 golden at the edges, 1 charred. */
  browning?: number;
  seed?: number;
}

export const BASE = "#f2efdf";

const ramp = (t: number, a: number, b: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** How green the stalk is at `t`, from its root (0) to its tip (1). */
export function greenAt(shape: StalkShape, t: number): number {
  switch (shape) {
    case "scallion":
      return ramp(t, 0.24, 0.85);
    case "leek":
      return ramp(t, 0.3, 0.62);
    case "celery":
      return 0.5 + 0.5 * ramp(t, 0, 0.75);
    case "lemongrass":
      return 0.12 + 0.7 * ramp(t, 0.2, 1);
  }
}

export const skinAt = (shape: StalkShape, base: string, color: string, t: number) => mix(base, color, greenAt(shape, t));

/** One tube of the plant: the stalk, a leaf or a branch, as a spine with a width at every point. */
export interface Tube {
  outline: Pt[];
  spine: Pt[];
  widths: number[];
  kind: "stalk" | "leaf" | "sheath";
  /** Lines along it: veins, ridges or layers. */
  veins: Pt[][];
  /** The crease down the middle of a folded leaf. */
  fold?: Pt[];
}

export interface StalkGeometry {
  tubes: Tube[];
  roots: Pt[][];
  /** Small lobed leaves at the end of celery's branches. */
  leaflets: { outline: Pt[]; veins: Pt[][] }[];
  /** The trimmed root end, seen as an ellipse. */
  cap?: { at: Pt; rx: number; ry: number; deg: number };
  /** The stalk's own axis, for colouring it from root to tip. */
  from: Pt;
  to: Pt;
  bottom: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A gently bent line from `start`, `n` points long. `droop` pulls the far end down, as a heavy leaf hangs. */
export function line(start: Pt, deg: number, length: number, bend: number, droop = 0, n = 24): Pt[] {
  const [dx, dy] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const off = bend * Math.sin(Math.PI * t);
    return [start[0] + dx * length * t - dy * off, start[1] + dy * length * t + dx * off + droop * t * t];
  });
}

function normal(spine: Pt[], i: number): Pt {
  const a = spine[Math.max(0, i - 1)]!;
  const b = spine[Math.min(spine.length - 1, i + 1)]!;
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
}

/** Points `s` half-widths off the spine (negative is the upper side), between two fractions of its length. */
export function along(spine: Pt[], widths: number[], s: number, from = 0, to = 1): Pt[] {
  const n = spine.length;
  const out: Pt[] = [];
  for (let i = Math.round(from * (n - 1)); i <= Math.round(to * (n - 1)); i++) {
    const [nx, ny] = normal(spine, i);
    const p = spine[i]!;
    const h = (widths[i]! / 2) * s;
    out.push([p[0] + nx * h, p[1] + ny * h]);
  }
  return out;
}

/** A band between two offsets across the tube, as a closed polygon: for highlights and shadows. */
export function band(spine: Pt[], widths: number[], s0: number, s1: number, from = 0, to = 1): Pt[] {
  return [...along(spine, widths, s0, from, to), ...along(spine, widths, s1, from, to).reverse()];
}

type End = "round" | "flat" | "point" | "cut";

/** The tube's outline: its two sides, with the ends rounded, left flat, pointed or cut on a slant. */
export function outlineOf(spine: Pt[], widths: number[], start: End, tip: End, slant = 0.5): Pt[] {
  const n = spine.length;
  const left = along(spine, widths, -1);
  const right = along(spine, widths, 1);
  const cap = (i: number, out: Pt, reverse: boolean): Pt[] => {
    const c = spine[i]!;
    const [nx, ny] = normal(spine, i);
    const h = widths[i]! / 2;
    const pts = Array.from({ length: 7 }, (_, j): Pt => {
      const th = -Math.PI / 2 + (Math.PI * (j + 1)) / 8;
      const [dc, ds] = [Math.cos(th) * h * 0.8, Math.sin(th) * h];
      return [c[0] + out[0] * dc + nx * ds, c[1] + out[1] * dc + ny * ds];
    });
    return reverse ? pts.reverse() : pts;
  };
  const dir = (i: number, j: number): Pt => {
    const [a, b] = [spine[i]!, spine[j]!];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const fwd = dir(n - 2, n - 1);
  const back = dir(1, 0);
  if (tip === "cut") {
    const h = widths[n - 1]! / 2;
    left[n - 1] = [left[n - 1]![0] + fwd[0] * h * slant, left[n - 1]![1] + fwd[1] * h * slant];
    right[n - 1] = [right[n - 1]![0] - fwd[0] * h * slant, right[n - 1]![1] - fwd[1] * h * slant];
  }
  return [
    ...left,
    ...(tip === "round" ? cap(n - 1, fwd, true) : []),
    ...right.reverse(),
    ...(start === "round" ? cap(0, back, false) : []),
  ];
}

function tube(spine: Pt[], width: (t: number) => number, kind: Tube["kind"], start: End, tip: End, slant = 0.5): Tube {
  const widths = spine.map((_, i) => width(i / (spine.length - 1)));
  return { outline: outlineOf(spine, widths, start, tip, slant), spine, widths, kind, veins: [] };
}

/** A celery leaflet: three rounded, toothed lobes, pointing along `deg`. */
function leaflet(at: Pt, deg: number, size: number, rand: () => number): { outline: Pt[]; veins: Pt[][] } {
  const a = rad(deg);
  const phase = rand() * 6;
  const outline = Array.from({ length: 30 }, (_, i): Pt => {
    const th = (i / 30) * Math.PI * 2;
    const lobes = 0.55 + 0.45 * Math.abs(Math.cos(1.5 * th));
    const teeth = 1 + 0.07 * Math.sin(10 * th + phase);
    const r = size * lobes * teeth;
    const [x, y] = [Math.cos(th) * r * 1.15 + size * 0.75, Math.sin(th) * r * 0.9];
    return [at[0] + x * Math.cos(a) - y * Math.sin(a), at[1] + x * Math.sin(a) + y * Math.cos(a)];
  });
  const veins = [-2.1, 0, 2.1].map((th): Pt[] =>
    [0, 0.5, 0.95].map((k) => {
      const [x, y] = [Math.cos(th) * size * k * 1.1 + size * 0.75 * (1 - Math.abs(th) / 6), Math.sin(th) * size * k * 0.85];
      return [at[0] + x * Math.cos(a) - y * Math.sin(a), at[1] + x * Math.sin(a) + y * Math.cos(a)];
    }),
  );
  return { outline, veins };
}

function rootsFrom(at: Pt, deg: number, count: number, length: number, spread: number, rand: () => number): Pt[][] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const a = rad(deg + 180 + t * spread + (rand() * 2 - 1) * 10);
    const len = length * (0.6 + rand() * 0.6);
    const start: Pt = [at[0], at[1] + t * 3];
    return [0, 0.5, 1].map((k): Pt => [
      start[0] + Math.cos(a) * len * k + (k === 0.5 ? (rand() * 2 - 1) * 1.2 : 0),
      start[1] + Math.sin(a) * len * k + (k === 0.5 ? (rand() * 2 - 1) * 1.2 : 0),
    ]);
  });
}

/** A whole stalk lying on the counter, root to the left, rising gently to the right. `wilt` droops the leaves. */
export function stalkGeometry(shape: StalkShape, seed: number, wilt = 0): StalkGeometry {
  const rand = rng(seed * 59 + 17);
  const wob = () => rand() * 2 - 1;
  const deg = -27 + wob() * 4;
  const tubes: Tube[] = [];
  const leaflets: StalkGeometry["leaflets"] = [];
  let roots: Pt[][] = [];
  let cap: StalkGeometry["cap"];
  let stalk: Tube;

  switch (shape) {
    case "scallion": {
      const len = 100;
      const spine = line([0, 0], deg, len * 0.42, wob() * 0.8);
      /** A round white bulb, a slim neck, then the shaft narrows where the leaves leave it together. */
      stalk = tube(
        spine,
        (t) => (5.6 + 5.6 * Math.exp(-(((t - 0.07) / 0.085) ** 2))) * (1 - 0.35 * ramp(t, 0.72, 1)),
        "stalk",
        "round",
        "round",
      );
      stalk.veins = [-0.4, 0, 0.4].map((s) => along(spine, stalk.widths, s, 0.16, 0.92));
      /** A narrow fan from one point: the upper leaves stand straight, the lower ones arch down under their own weight. */
      const leaves = [-8, -3, 2, 7].map((turn, i) => {
        const from = spine[Math.round((0.8 + i * 0.05) * (spine.length - 1))]!;
        const l = line(from, deg + turn + wob() * 1.5, len * (0.64 + rand() * 0.12), -1.5 + wob() * 1.5, 1 + i * 2.6 + wilt * 14);
        const leaf = tube(l, (t) => 4.6 * (1 - 0.7 * t ** 1.8), "leaf", "flat", "round");
        leaf.veins = [along(l, leaf.widths, 0, 0.05, 0.85)];
        return leaf;
      });
      tubes.push(...leaves, stalk);
      roots = rootsFrom(spine[0]!, deg, 14, 9, 130, rand);
      break;
    }
    case "leek": {
      const len = 88;
      const spine = line([0, 0], deg, len * 0.56, wob());
      stalk = tube(spine, (t) => 17 + 1.4 * Math.exp(-(((t - 0.03) / 0.06) ** 2)) - 1.5 * t, "stalk", "flat", "cut", 2);
      stalk.veins = [-0.7, -0.4, -0.1, 0.25, 0.55, 0.8].map((s) => along(spine, stalk.widths, s, 0.04, 0.9));
      const leaves = [-14, -5, 4, 13].map((turn, i) => {
        const from = spine[Math.round((0.6 + i * 0.09) * (spine.length - 1))]!;
        const l = line(from, deg + turn + wob() * 3, len * (0.46 + rand() * 0.08), wob() * 3, wilt * 10);
        const leaf = tube(l, (t) => (14.5 - 2.5 * t) * (1 - i * 0.04), "leaf", "flat", "cut", 0.5 + wob() * 0.3);
        leaf.fold = along(l, leaf.widths, 0.05 * wob(), 0.08, 0.98);
        leaf.veins = [-0.55, 0.5].map((s) => along(l, leaf.widths, s, 0.08, 0.95));
        return leaf;
      });
      tubes.push(...[leaves[0]!, leaves[3]!, leaves[1]!, leaves[2]!], stalk);
      cap = { at: spine[0]!, rx: 3, ry: stalk.widths[0]! * 0.47, deg };
      roots = rootsFrom(spine[0]!, deg, 16, 5, 120, rand);
      break;
    }
    case "celery": {
      const len = 90;
      const spine = line([0, 0], deg, len * 0.78, wob() * 1.5);
      stalk = tube(spine, (t) => 12.5 + 1.6 * Math.exp(-(((t - 0.02) / 0.05) ** 2)) - 4.8 * t, "stalk", "flat", "round");
      stalk.veins = [-0.66, -0.4, -0.14, 0.12, 0.38, 0.64].map((s) => along(spine, stalk.widths, s, 0.02, 0.97));
      const end = spine[spine.length - 1]!;
      const branches = [-30, -3, 24].map((turn) => {
        const l = line(end, deg + turn + wob() * 6, len * (0.12 + rand() * 0.05), wob() * 1.5, wilt * 4, 10);
        const b = tube(l, (t) => 2.9 - 0.9 * t, "leaf", "flat", "round");
        const tip = l[l.length - 1]!;
        const a = deg + turn;
        for (const off of [-38, 0, 36]) leaflets.push(leaflet(tip, a + off + wob() * 8, 4.6 + rand() * 1.6, rand));
        return b;
      });
      tubes.push(...branches, stalk);
      cap = { at: spine[0]!, rx: 2.4, ry: stalk.widths[0]! * 0.47, deg };
      break;
    }
    case "lemongrass": {
      const len = 92;
      const spine = line([0, 0], deg, len, wob() * 1.5);
      stalk = tube(spine, (t) => 8.4 + 2.2 * Math.exp(-(((t - 0.1) / 0.08) ** 2)) - 3.6 * t, "stalk", "flat", "cut", 0.6);
      stalk.veins = [-0.55, -0.25, 0.05, 0.35, 0.62].map((s) => along(spine, stalk.widths, s, 0.03, 0.98));
      /** One dry outer layer, split from the stalk partway up and running on past the cut top. */
      const from = along(spine, stalk.widths, -0.55, 0.55, 0.55)[0]!;
      const l = line(from, deg - 1.5 + wob(), len * 0.52, -0.8, wilt * 6);
      const sheath = tube(l, (t) => 3.6 * Math.min(1, 0.15 + t / 0.2) * Math.max(0.1, 1 - t ** 2), "sheath", "flat", "point");
      sheath.veins = [along(l, sheath.widths, 0, 0.05, 0.85)];
      tubes.push(stalk, sheath);
      cap = { at: spine[0]!, rx: 2.4, ry: stalk.widths[0]! * 0.47, deg };
      break;
    }
  }

  const all = [...tubes.flatMap((t) => t.outline), ...roots.flat(), ...leaflets.flatMap((l) => l.outline)];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(84 / (r - l), 66 / (b - t));
  const fit = ([x, y]: Pt): Pt => [50 + (x - (l + r) / 2) * k, 52 + (y - (t + b) / 2) * k];
  const go = (p: Pt[]) => p.map(fit);

  return {
    tubes: tubes.map((tb) => ({
      ...tb,
      outline: go(tb.outline),
      spine: go(tb.spine),
      widths: tb.widths.map((w) => w * k),
      veins: tb.veins.map(go),
      fold: tb.fold && go(tb.fold),
    })),
    roots: roots.map(go),
    leaflets: leaflets.map((lf) => ({ outline: go(lf.outline), veins: lf.veins.map(go) })),
    cap: cap && { at: fit(cap.at), rx: cap.rx * k, ry: cap.ry * k, deg: cap.deg },
    from: fit(stalk.spine[0]!),
    to: fit(stalk.spine[stalk.spine.length - 1]!),
    bottom: 52 + ((b - t) / 2) * k,
  };
}
