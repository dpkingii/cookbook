import type { ArtProps } from "../core/Art";
import { sampleClosed } from "../core/geometry";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/** Broccoli: a dark green dome of tiny buds on a thick branching stalk. Cauliflower: a tight white curd cupped in leaves. */
export type FloretShape = "broccoli" | "cauliflower";

export interface FloretProps extends ArtProps {
  /** Colour of the buds (broccoli) or the curd (cauliflower). */
  color: string;
  /** Colour of the stalk and branches. */
  stem?: string;
  /** Colour of a cauliflower's wrapping leaves. */
  leaf?: string;
  shape?: FloretShape;
  /** Wedges are large florets and diced bite-size ones; halved and sliced show the cut face and its branching; minced is riced; strips and rings cut the peeled stalk. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: steamed broccoli turns vivid green, roasted florets brown and char at the tips. */
  cooked?: boolean;
  /** Colour of the cooked buds before any browning. */
  cookedColor?: string;
  /** 0 is just steamed, 0.5 roasted golden at the tips, 1 charred. */
  browning?: number;
  seed?: number;
}

export const STEM: Record<FloretShape, string> = { broccoli: "#9cbf62", cauliflower: "#dfe6b8" };
export const LEAF = "#6f9e4e";

/** One bud cluster on the crown, as a bumpy closed outline, and the branch that feeds it. */
export interface Lobe {
  outline: Pt[];
  at: Pt;
  r: number;
}

export interface FloretGeometry {
  lobes: Lobe[];
  stalk: Pt[];
  branches: Pt[][];
  /** A cauliflower's leaves: behind the curd, then the ones wrapping its front. */
  leavesBack: { outline: Pt[]; rib: Pt[] }[];
  leavesFront: { outline: Pt[]; rib: Pt[] }[];
  bottom: number;
  box: { l: number; r: number; t: number; b: number };
}

/** A lobe: a circle of buds, its edge knobbly with smaller buds. */
export function lobe(x: number, y: number, r: number, seed: number, knobs = 11): Pt[] {
  const rand = rng(seed * 7 + 1);
  const phase = rand() * 6.28;
  return Array.from({ length: knobs * 4 }, (_, i): Pt => {
    const a = (i / (knobs * 4)) * Math.PI * 2;
    const k = 1 + 0.07 * Math.abs(Math.sin((a * knobs) / 2 + phase)) - 0.035 + (rand() - 0.5) * 0.03;
    return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.92];
  });
}

/** A leaf: long and pointed, with a pale rib, curving from `at` toward `deg`. */
function leafShape(at: Pt, deg: number, length: number, width: number, curl: number, seed: number) {
  const rand = rng(seed * 13 + 3);
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const [nx, ny] = [-dy, dx];
  const pt = (t: number, s: number): Pt => {
    const bend = curl * Math.sin(Math.PI * t) * length * 0.15;
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8 * (1 + 0.08 * Math.sin(t * 17 + seed));
    return [at[0] + dx * length * t + nx * (bend + s * w), at[1] + dy * length * t + ny * (bend + s * w)];
  };
  const side = (s: number) => Array.from({ length: 12 }, (_, i) => pt(i / 11, s * (1 + (rand() - 0.5) * 0.06)));
  return { outline: [...side(1), ...side(-1).reverse()], rib: Array.from({ length: 8 }, (_, i) => pt((i / 7) * 0.9, 0)) };
}

/** A whole head lying on the counter, stalk to the lower left, crown to the upper right. */
export function floretGeometry(shape: FloretShape, seed: number): FloretGeometry {
  const rand = rng(seed * 53 + 31);
  const wob = () => rand() * 2 - 1;
  const cauli = shape === "cauliflower";
  const tilt = ((-24 + wob() * 5) * Math.PI) / 180;
  const rot = ([x, y]: Pt): Pt => [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
  /** Local frame: the stalk runs along +x into the crown, centred at (C, 0). */
  const C = cauli ? 30 : 46;
  const R = cauli ? 34 : 30;
  const lobes: Lobe[] = [];
  if (cauli) {
    /** A cauliflower's curd is a solid dome: lobes packed over a whole disc, smaller toward the rim. */
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + wob() * 0.2;
      const d = R * 0.92 * Math.sqrt((i + 0.5) / n);
      const r = 9.5 * (1.1 - 0.4 * (d / R)) * (0.9 + rand() * 0.2);
      const [x, y] = [C + Math.cos(a) * d * 0.95, Math.sin(a) * d * 0.85];
      lobes.push({ at: [x, y], r, outline: lobe(x, y, r, seed * 100 + i, 9) });
    }
  }
  const n = cauli ? 0 : 19;
  for (let i = 0; i < n; i++) {
    /** Golden-angle spread over a half dome facing +x, denser and smaller toward the rim. */
    const t = (i + 0.5) / n;
    const a = -Math.PI / 2 + t * Math.PI + wob() * 0.12;
    const d = R * (0.35 + 0.65 * Math.sqrt(((i * 0.618) % 1) * 0.8 + 0.2));
    const r = (cauli ? 8.5 : 10) * (1.05 - 0.3 * (d / R)) * (0.85 + rand() * 0.3);
    const [x, y] = [C + Math.cos(a) * d * 0.9, Math.sin(a) * d];
    lobes.push({ at: [x, y], r, outline: lobe(x, y, r, seed * 100 + i, cauli ? 9 : 12) });
  }
  /** A few lobes fill the middle, so the dome has no holes. */
  for (let i = 0; i < (cauli ? 0 : 5); i++) {
    const [x, y] = [C + 4 + wob() * R * 0.35, wob() * R * 0.5];
    const r = (cauli ? 10 : 11) * (0.9 + rand() * 0.2);
    lobes.push({ at: [x, y], r, outline: lobe(x, y, r, seed * 200 + i, cauli ? 9 : 12) });
  }
  /** Lobes nearer the viewer (lower) and further out on the dome are drawn last. */
  lobes.sort((p, q) => p.at[0] * 0.4 + p.at[1] - (q.at[0] * 0.4 + q.at[1]));

  const sw = cauli ? 15 : 13;
  const stalk: Pt[] = cauli
    ? [
        [-6, -sw * 0.55],
        [C - 12, -sw * 0.8],
        [C - 12, sw * 0.8],
        [-6, sw * 0.55],
      ]
    : [
        [0, -sw * 0.42],
        [C - 26, -sw * 0.5],
        [C - 12, -sw * 0.95],
        [C - 12, sw * 0.95],
        [C - 26, sw * 0.5],
        [0, sw * 0.42],
      ];
  const branches = cauli
    ? []
    : Array.from({ length: 5 }, (_, i): Pt[] => {
        const target = lobes[Math.floor(((i + 0.5) / 5) * lobes.length)]!.at;
        const from: Pt = [C - 24, (i - 2) * 2.2];
        return [from, [(from[0] + target[0]) / 2, (from[1] + target[1]) / 2 + wob() * 2], [target[0] - 4, target[1]]];
      });

  const leavesBack: FloretGeometry["leavesBack"] = [];
  const leavesFront: FloretGeometry["leavesFront"] = [];
  if (cauli) {
    for (const [deg, len, w, front] of [
      [-70, 46, 13, false],
      [-30, 50, 14, false],
      [20, 48, 14, false],
      [62, 42, 12, true],
      [95, 36, 11, true],
    ] as const) {
      const l = leafShape([C - R * 0.55, R * 0.25], deg + wob() * 6, len, w, wob(), seed * 9 + deg);
      (front ? leavesFront : leavesBack).push(l);
    }
  }

  const g = {
    lobes: lobes.map((l) => ({ at: rot(l.at), r: l.r, outline: l.outline.map(rot) })),
    stalk: sampleClosed(stalk.map(rot), 2),
    branches: branches.map((b) => b.map(rot)),
    leavesBack: leavesBack.map((l) => ({ outline: l.outline.map(rot), rib: l.rib.map(rot) })),
    leavesFront: leavesFront.map((l) => ({ outline: l.outline.map(rot), rib: l.rib.map(rot) })),
  };
  const all = [...g.lobes.flatMap((l) => l.outline), ...g.stalk, ...g.leavesBack.flatMap((l) => l.outline), ...g.leavesFront.flatMap((l) => l.outline)];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(84 / (r - l), 74 / (b - t));
  const fit = ([x, y]: Pt): Pt => [50 + (x - (l + r) / 2) * k, 50 + (y - (t + b) / 2) * k];
  const go = (p: Pt[]) => p.map(fit);
  const out = {
    lobes: g.lobes.map((lb) => ({ at: fit(lb.at), r: lb.r * k, outline: go(lb.outline) })),
    stalk: go(g.stalk),
    branches: g.branches.map(go),
    leavesBack: g.leavesBack.map((lf) => ({ outline: go(lf.outline), rib: go(lf.rib) })),
    leavesFront: g.leavesFront.map((lf) => ({ outline: go(lf.outline), rib: go(lf.rib) })),
  };
  const fitted = [...out.lobes.flatMap((lb) => lb.outline), ...out.stalk, ...out.leavesBack.flatMap((lf) => lf.outline), ...out.leavesFront.flatMap((lf) => lf.outline)];
  const fx = fitted.map((p) => p[0]);
  const fy = fitted.map((p) => p[1]);
  return { ...out, bottom: Math.max(...fy), box: { l: Math.min(...fx), r: Math.max(...fx), t: Math.min(...fy), b: Math.max(...fy) } };
}

/** Points on the convex hull, for framing and measuring a piece made of many parts. */
export function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

