import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat } from "../core/geometry";
import { rng, type Pt } from "../core/rough";
import type { RoundShape } from "./round-shape";

/** What a part of a cut face is made of, which decides its colour. */
export type Role = "gel" | "seed" | "core" | "pith" | "segment" | "pulp" | "membrane" | "carpel" | "vein" | "stem" | "fibre";

export interface Part {
  role: Role;
  pts: Pt[];
  closed: boolean;
  /** Stroke width, for open lines. */
  w?: number;
}

/** One cut piece: its face, what shows on the face, where the peel runs round it, and how thick it stands. */
export interface RoundPiece {
  outer: Pt[];
  hole?: Pt[];
  /** Drawn on the face, inside its outline. */
  parts: Part[];
  /** Drawn over everything, not kept inside the face: an apple half's stem. */
  over: Part[];
  /** Runs of the outline that carry skin, with the peel's width and the white pith inside it. */
  rind: Pt[][];
  rindW: number;
  pithW: number;
  /** What the face is: flesh, pith (citrus, under its segments), or skin (a strip of peel). */
  face: "flesh" | "pith" | "skin";
  /** What shows on the side below the face. */
  side: "skin" | "flesh" | "pith";
  thick: number;
  /** A strand of zest: drawn as a line this wide along `outer` instead of as a face. */
  strand?: number;
}

export interface RoundCut {
  pieces: RoundPiece[];
  /** Many tiny pieces: one shadow under the heap instead of one per piece. */
  heap: boolean;
}

type Face = Omit<RoundPiece, "over" | "hole"> & { over?: Part[]; hole?: Pt[] };

/** The cut each shape actually draws: rings are an apple's alone; on round fruit they are just slices. */
export function roundCut(shape: RoundShape, cut: Exclude<Cut, "whole">): Exclude<Cut, "whole"> {
  return cut === "rings" && shape !== "apple" ? "sliced" : cut;
}

const TAU = Math.PI * 2;
const polar = (r: number, a: number, c: Pt = [0, 0]): Pt => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
const arc = (r: number, a0: number, a1: number, n = 24, c: Pt = [0, 0]): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => polar(r, a0 + ((a1 - a0) * i) / n, c));
const circle = (r: number, n = 40, c: Pt = [0, 0]) => arc(r, 0, TAU, n, c).slice(0, -1);
const closeLoop = (p: Pt[]) => [...p, p[0]!];

/** A teardrop at `at`, its point toward the angle `ang`. */
function drop(at: Pt, ang: number, len: number, wid: number): Pt[] {
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  return Array.from({ length: 8 }, (_, i) => {
    const th = (i / 8) * TAU;
    const narrow = 0.45 + 0.55 * ((1 - Math.cos(th)) / 2);
    const [lx, ly] = [(Math.cos(th) * len) / 2, ((Math.sin(th) * wid) / 2) * narrow];
    return [at[0] + lx * c - ly * s, at[1] + lx * s + ly * c] as Pt;
  });
}

/** A rounded box of side `w` by `h`, its corners clipped, nudged a little by `rand`. */
function block(w: number, h: number, rand: () => number): Pt[] {
  const [x, y, k] = [w / 2, h / 2, Math.min(w, h) * 0.18];
  const j = () => (rand() - 0.5) * Math.min(w, h) * 0.12;
  return [
    [-x + k + j(), -y + j()],
    [x - k + j(), -y + j()],
    [x + j(), -y + k + j()],
    [x + j(), y - k + j()],
    [x - k + j(), y + j()],
    [-x + k + j(), y + j()],
    [-x + j(), y - k + j()],
    [-x + j(), -y + k + j()],
  ];
}

/** A tomato cut across: gel-filled chambers full of seeds, walls of flesh between them, a pale core. */
function tomatoSection(R: number, rand: () => number): Face {
  const rot = rand() * TAU;
  const n = rand() < 0.5 ? 3 : 4;
  const parts: Part[] = [];
  const core = Array.from({ length: 36 }, (_, k): Pt => {
    const b = rot + (k / 36) * TAU;
    return polar(R * (0.17 + 0.15 * Math.max(0, Math.cos(n * (b - rot) + Math.PI)) ** 4), b);
  });
  parts.push({ role: "core", pts: core, closed: true });
  /** Faint threads running out through the tomato's wall. */
  for (let i = 0; i < 30; i++) {
    const a = rot + (i / 30) * TAU + rand() * 0.12;
    parts.push({ role: "fibre", pts: [polar(R * 0.8, a), polar(R * 0.87, a + (rand() - 0.5) * 0.05), polar(R * 0.94, a)], closed: false, w: R * 0.012 });
  }
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    const hw = Math.PI / n - 0.2;
    parts.push({ role: "gel", pts: [...arc(R * 0.79, a - hw, a + hw, 8), ...arc(R * 0.34, a + hw * 0.55, a - hw * 0.55, 4)], closed: true });
    const m = 5 + Math.floor(rand() * 3);
    for (let j = 0; j < m; j++) {
      const s = j / (m - 1) - 0.5;
      const ang = a + s * hw * 1.3;
      const r = R * (0.45 + rand() * 0.08 + Math.abs(s) * 0.08);
      parts.push({ role: "seed", pts: drop(polar(r, ang), ang + (rand() - 0.5) * 0.8, R * 0.11, R * 0.065), closed: true });
    }
  }
  const outer = circle(R);
  return { outer, parts, rind: [closeLoop(outer)], rindW: Math.max(0.7, R * 0.03), pithW: 0, face: "flesh", side: "flesh", thick: 2.4 };
}

/** A citrus cut across: a ring of juicy segments split by white membranes, inside the peel and its pith. */
function citrusSection(R: number, rand: () => number, lemon: boolean, seeds = true): Face {
  const rot = rand() * TAU;
  const n = 9 + Math.floor(rand() * 3);
  const parts: Part[] = [];
  const gap = R * 0.028;
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    const hwAt = (r: number) => Math.max(0.04, Math.PI / n - gap / r);
    const side = (sgn: number) => [0.11, 0.2, 0.4, 0.62, 0.84].map((k): Pt => polar(R * k, a + sgn * hwAt(R * k) * (k < 0.15 ? 0.4 : 1)));
    const cap = arc(R * 0.86, a - hwAt(R * 0.86) * 0.7, a + hwAt(R * 0.86) * 0.7, 4).slice(1, -1);
    parts.push({ role: "segment", pts: [...side(-1), ...cap, ...side(1).reverse()], closed: true });
    for (const s of [-0.55, 0, 0.55])
      parts.push({ role: "pulp", pts: [polar(R * 0.25, a + s * hwAt(R * 0.25)), polar(R * 0.5, a + s * hwAt(R * 0.5) * 0.9), polar(R * 0.76, a + s * hwAt(R * 0.76) * 0.85)], closed: false, w: R * 0.022 });
    if (seeds && rand() < (lemon ? 0.35 : 0.15)) parts.push({ role: "seed", pts: drop(polar(R * 0.3, a), a + Math.PI, R * 0.16, R * 0.08), closed: true });
  }
  parts.push({ role: "pith", pts: circle(R * 0.08, 10), closed: true });
  const outer = circle(R);
  return { outer, parts, rind: [closeLoop(outer)], rindW: R * 0.055, pithW: R * (lemon ? 0.08 : 0.06), face: "pith", side: "flesh", thick: 2.2 };
}

/** An apple cut across: cream flesh, the faint five-lobed line of the core, and the star of seed pockets. */
function appleCross(R: number, rand: () => number, cored: boolean): Face {
  const rot = rand() * TAU;
  const parts: Part[] = [];
  parts.push({ role: "vein", pts: closeLoop(Array.from({ length: 40 }, (_, k) => { const b = rot + (k / 40) * TAU; return polar(R * (0.38 + 0.07 * Math.cos(5 * (b - rot))), b); })), closed: false, w: R * 0.02 });
  /** The flesh's faint fibres, radiating from the core. */
  for (let i = 0; i < 18; i++) {
    const a = rot + (i / 18) * TAU + (rand() - 0.5) * 0.15;
    parts.push({ role: "fibre", pts: [0.5, 0.63, 0.76, 0.9].map((k) => polar(R * k, a + (rand() - 0.5) * 0.06)), closed: false, w: R * 0.012 });
  }
  for (let i = 0; i < 10; i++) parts.push({ role: "vein", pts: circle(R * 0.022, 6, polar(R * 0.47, rot + (i * TAU) / 10 + Math.PI / 10)), closed: true });
  if (!cored)
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * TAU) / 5;
      parts.push({ role: "carpel", pts: drop(polar(R * 0.2, a), a, R * 0.24, R * 0.11), closed: true });
      if (rand() < 0.75) parts.push({ role: "seed", pts: drop(polar(R * 0.17, a), a + Math.PI, R * 0.14, R * 0.075), closed: true });
    }
  const outer = circle(R);
  return { outer, hole: cored ? circle(R * 0.25, 20) : undefined, parts, rind: [closeLoop(outer)], rindW: Math.max(1, R * 0.05), pithW: 0, face: "flesh", side: "skin", thick: 2.4 };
}

/** An apple split through its core: the heart-shaped outline, the core's faint vase, two seed pockets and the stem. */
function appleLong(R: number, rand: () => number): Face {
  const h = (t: number) => R * 0.85 * Math.cos(Math.PI * t) - R * 0.2 * Math.exp(-((t / 0.2) ** 2)) + R * 0.09 * Math.exp(-(((1 - t) / 0.14) ** 2));
  const rho = (t: number) => R * Math.sin(Math.PI * t) ** 0.95 * (1 + 0.1 * Math.cos(Math.PI * t));
  const ts = Array.from({ length: 21 }, (_, i) => i / 20);
  const right = ts.map((t): Pt => [rho(t), -h(t)]);
  const left = [...ts].reverse().map((t): Pt => [-rho(t), -h(t)]);
  const outer = [...right.slice(0, -1), ...left.slice(0, -1)];
  const [top, bottom] = [-h(0), -h(1)];
  const vase = (sgn: number) =>
    Array.from({ length: 9 }, (_, i): Pt => {
      const u = i / 8;
      return [sgn * R * (0.03 + 0.3 * Math.sin(Math.PI * u) ** 0.8), top + (bottom - top) * (0.05 + u * 0.88)];
    });
  const mid = top + (bottom - top) * 0.5;
  /** Fibres follow the apple's curve, between the core and the skin. */
  const fibres: Part[] = [0.62, 0.8].flatMap((k) =>
    [-1, 1].map((sgn): Part => ({
      role: "fibre",
      pts: outer.filter(([x]) => sgn * x > R * 0.25).map(([x, y]): Pt => [x * k, mid + (y - mid) * k]).sort((a, b) => a[1] - b[1]),
      closed: false,
      w: R * 0.012,
    })),
  );
  const parts: Part[] = [
    ...fibres,
    { role: "vein", pts: vase(1), closed: false, w: R * 0.02 },
    { role: "vein", pts: vase(-1), closed: false, w: R * 0.02 },
    { role: "vein", pts: [[0, top + 2], [0, bottom - 2]], closed: false, w: R * 0.015 },
  ];
  for (const sgn of [-1, 1]) {
    const at: Pt = [sgn * R * 0.11, mid - R * 0.04];
    const ang = -Math.PI / 2 + sgn * 0.25;
    parts.push({ role: "carpel", pts: drop(at, ang, R * 0.34, R * 0.15), closed: true });
    if (rand() < 0.85) parts.push({ role: "seed", pts: drop([at[0], at[1] + R * 0.03], ang, R * 0.2, R * 0.1), closed: true });
  }
  parts.push({ role: "vein", pts: circle(R * 0.05, 8, [0, bottom - R * 0.04]), closed: true });
  const over: Part[] = [{ role: "stem", pts: [[0, top + 1], [R * 0.06, top - R * 0.2], [R * 0.16, top - R * 0.4]], closed: false, w: R * 0.08 }];
  return { outer, parts, over, rind: [closeLoop(outer)], rindW: Math.max(0.8, R * 0.035), pithW: 0, face: "flesh", side: "skin", thick: 7 };
}

/** A wedge of round fruit lying on its side: the skin on the curve, a straight face along the core. */
function dWedge(R: number, span: number, notch: number): Pt[] {
  const a = span / 2;
  const curve = arc(R, -a, a, 16);
  const cx = R * Math.cos(a);
  return [...curve, [cx + notch * 0.4, R * Math.sin(a) * 0.4], [cx + notch, 0], [cx + notch * 0.4, -R * Math.sin(a) * 0.4]];
}

function tomatoWedge(R: number, rand: () => number): Face {
  const a = 1.3;
  const outer = dWedge(R, a * 2, 0);
  const cx = R * Math.cos(a);
  const parts: Part[] = [{ role: "core", pts: [[cx, -R * 0.75], [cx + R * 0.22, -R * 0.55], [cx + R * 0.26, 0], [cx + R * 0.22, R * 0.55], [cx, R * 0.75]], closed: true }];
  for (const sgn of [-1, 1]) {
    const c: Pt = [R * 0.6, sgn * R * 0.42];
    parts.push({ role: "gel", pts: circle(1, 12).map(([x, y]): Pt => [c[0] + x * R * 0.2, c[1] + y * R * 0.3]), closed: true });
    for (let j = 0; j < 4; j++) parts.push({ role: "seed", pts: drop([c[0] - R * 0.08 + rand() * R * 0.12, c[1] + (j - 1.5) * R * 0.13], (rand() - 0.5) * 1.2, R * 0.12, R * 0.07), closed: true });
  }
  return { outer, parts, rind: [arc(R, -a, a, 16)], rindW: Math.max(0.7, R * 0.03), pithW: 0, face: "flesh", side: "skin", thick: 5 };
}

function appleWedge(R: number, span: number, thick: number): Face {
  const a = span / 2;
  const outer = dWedge(R, span, R * 0.16);
  return {
    outer,
    parts: [{ role: "vein", pts: arc(R * 0.68, -a * 0.8, a * 0.8, 10), closed: false, w: R * 0.02 }],
    rind: [arc(R, -a, a, 16)],
    rindW: Math.max(1, R * 0.06),
    pithW: 0,
    face: "flesh",
    side: "skin",
    thick,
  };
}

/** A thin apple slice: a crescent, skin along its outer curve. */
function crescent(R: number): Face {
  const a = 1.15;
  const outerCurve = arc(R, -a, a, 16);
  const x0 = R * Math.cos(a);
  const inner = Array.from({ length: 9 }, (_, i): Pt => {
    const s = 1 - (i / 8) * 2;
    return [x0 + (R * 0.66 - x0) * (1 - s * s), R * Math.sin(a) * s * 0.98];
  });
  return {
    outer: [...outerCurve, ...inner.slice(1, -1)],
    parts: [{ role: "vein", pts: arc(R * 0.84, -a * 0.6, a * 0.6, 8), closed: false, w: R * 0.02 }],
    rind: [outerCurve],
    rindW: Math.max(1, R * 0.06),
    pithW: 0,
    face: "flesh",
    side: "skin",
    thick: 2,
  };
}

/** A citrus wedge lying on its peel: a boat, the peel and pith along its curve, juicy pulp on the face. */
function boat(R: number, lemon: boolean): Face {
  const [L, S] = [R * (lemon ? 1.2 : 0.95), R * 0.55];
  const xs = Array.from({ length: 13 }, (_, i) => -L + (2 * L * i) / 12);
  const curve = xs.map((x): Pt => [x, S * (1 - (x / L) ** 2) ** (lemon ? 0.75 : 0.55)]);
  const lip = [...xs].reverse().slice(1, -1).map((x): Pt => [x, -S * 0.12 * (1 - (x / L) ** 2)]);
  const parts: Part[] = [];
  for (const k of [-0.36, 0.36]) parts.push({ role: "membrane", pts: [[L * k * 0.7, -S * 0.08], [L * k, S * 0.4], [L * k * 1.2, S * 0.78]], closed: false, w: R * 0.04 });
  for (let i = 0; i < 9; i++) {
    const x = -L * 0.7 + (L * 1.4 * i) / 8;
    parts.push({ role: "pulp", pts: [[x * 0.95, -S * 0.02], [x * 1.05, S * 0.35], [x * 1.12, S * 0.62]], closed: false, w: R * 0.025 });
  }
  return { outer: [...curve, ...lip], parts, rind: [curve], rindW: R * 0.07, pithW: R * (lemon ? 0.08 : 0.06), face: "flesh", side: "flesh", thick: 4 };
}

/** A citrus segment cut free of its membranes: a plump lens of pulp. */
function supreme(len: number, wid: number): Face {
  const xs = Array.from({ length: 11 }, (_, i) => -len / 2 + (len * i) / 10);
  const top = xs.map((x): Pt => [x, -(wid / 2) * (1 - ((2 * x) / len) ** 2) ** 0.7]);
  const bottom = [...xs].reverse().slice(1, -1).map((x): Pt => [x, (wid / 2) * 0.7 * (1 - ((2 * x) / len) ** 2) ** 0.8]);
  const parts: Part[] = [-0.25, 0, 0.22].map((k) => ({
    role: "pulp" as const,
    pts: [[-len * 0.38, wid * k], [0, wid * (k - 0.1)], [len * 0.38, wid * k]] as Pt[],
    closed: false,
    w: wid * 0.08,
  }));
  return { outer: [...top, ...bottom], parts, rind: [], rindW: 0, pithW: 0, face: "flesh", side: "flesh", thick: 3 };
}

/** A long piece bent along a gentle curve: a tomato fillet, an apple matchstick, a strip of peel. */
function bentStrip(len: number, wid: number, bend: number, taper: number): Pt[] {
  const n = 10;
  const mid = (u: number): Pt => [(u - 0.5) * len, bend * (4 * (u - 0.5) ** 2 - 1)];
  const half = (u: number) => (wid / 2) * (1 - taper * Math.abs(2 * u - 1) ** 3);
  const top = Array.from({ length: n + 1 }, (_, i) => { const u = i / n; const [x, y] = mid(u); return [x, y - half(u)] as Pt; });
  const bottom = Array.from({ length: n + 1 }, (_, i) => { const u = 1 - i / n; const [x, y] = mid(u); return [x, y + half(u)] as Pt; });
  return [...top, ...bottom];
}

function lay(f: Face, at: { rot: number; x: number; y: number; squash?: number }, recentre = true): RoundPiece {
  const [cx, cy] = recentre ? centroid(f.outer) : [0, 0];
  const go = (p: Pt[]) => layFlat(p.map(([x, y]): Pt => [x - cx, y - cy]), at.rot, at.x, at.y, at.squash ?? 0.8);
  const part = (p: Part): Part => ({ ...p, pts: go(p.pts) });
  return { ...f, outer: go(f.outer), hole: f.hole && go(f.hole), parts: f.parts.map(part), over: (f.over ?? []).map(part), rind: f.rind.map(go) };
}

/** Spreads the i-th of `count` pieces over an oval, the golden-angle way, so nothing lines up. */
function spot(i: number, count: number, rx: number, ry: number, rand?: () => number): Pt {
  const a = i * 2.39996 + (rand ? (rand() - 0.5) * 0.5 : 0);
  const r = Math.sqrt((i + 0.5) / count) * (rand ? 0.9 + rand() * 0.2 : 1);
  return [Math.cos(a) * rx * r, Math.sin(a) * ry * r - (1 - r) * 2];
}

export function cutRound(shape: RoundShape, cut: Exclude<Cut, "whole">, seed: number): RoundCut {
  const rand = rng(seed * 23 + 11);
  const wob = () => rand() * 2 - 1;
  const citrus = shape === "citrus" || shape === "lemon";
  const lemon = shape === "lemon";
  const R = lemon ? 23 : shape === "apple" ? 27 : 28;
  const section = (r: number) => (shape === "tomato" ? tomatoSection(r, rand) : citrus ? citrusSection(r, rand, lemon) : appleCross(r, rand, false));

  switch (roundCut(shape, cut)) {
    case "halved": {
      if (shape === "apple") {
        const f = appleLong(R * 0.95, rand);
        const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [-x, y]);
        const g: Face = { ...f, outer: mirror(f.outer).reverse(), parts: f.parts.map((p) => ({ ...p, pts: mirror(p.pts) })), over: f.over!.map((p) => ({ ...p, pts: mirror(p.pts) })), rind: f.rind.map(mirror) };
        return {
          heap: false,
          pieces: [lay(f, { rot: -0.12 + wob() * 0.05, x: -R * 1.05, y: 0, squash: 0.86 }, false), lay({ ...g, over: [] }, { rot: 0.12 + wob() * 0.05, x: R * 1.05, y: 3, squash: 0.86 }, false)],
        };
      }
      return {
        heap: false,
        pieces: [-1, 1].map((sgn, i) => lay({ ...section(R), side: "skin", thick: 9 }, { rot: wob(), x: sgn * (R + 3), y: i * 4, squash: 0.82 }, false)),
      };
    }
    case "sliced": {
      if (shape === "apple") {
        const pieces = Array.from({ length: 6 }, (_, i) => {
          const [x, y] = spot(i, 6, 22, 15);
          return lay(crescent(R * (0.8 + wob() * 0.06)), { rot: rand() * TAU, x, y, squash: 0.85 });
        });
        return { heap: false, pieces };
      }
      const sizes = [0.72, 0.92, 1, 0.94, 0.78];
      const pieces = sizes.map((k, i) => lay(section(R * 0.62 * k), { rot: wob(), x: -30 + i * 15 + wob() * 1.5, y: (i % 2) * 5 - 2 + wob(), squash: 0.82 }));
      return { heap: false, pieces };
    }
    case "rings": {
      const pieces = Array.from({ length: 4 }, (_, i) =>
        lay(appleCross(R * 0.66 * (0.9 + rand() * 0.15), rand, true), { rot: wob(), x: -26 + i * 17 + wob() * 2, y: (i % 2) * 6 - 3, squash: 0.82 }),
      );
      return { heap: false, pieces };
    }
    case "wedges": {
      const count = shape === "apple" ? 5 : 6;
      const pieces = Array.from({ length: count }, (_, i) => {
        const f = shape === "tomato" ? tomatoWedge(R * 0.62, rand) : citrus ? boat(R * 0.62, lemon) : appleWedge(R * 0.6, 2.5, 4);
        const [x, y] = spot(i, count, 26, 17);
        return lay(f, { rot: rand() * TAU, x, y });
      });
      return { heap: false, pieces };
    }
    case "diced": {
      if (citrus) {
        const pieces = Array.from({ length: 9 }, (_, i) => {
          const [x, y] = spot(i, 9, 30, 20);
          return lay(supreme(R * 0.75 * (0.9 + rand() * 0.2), R * 0.26), { rot: rand() * TAU, x, y });
        });
        return { heap: false, pieces };
      }
      const count = shape === "tomato" ? 30 : 36;
      const pieces = Array.from({ length: count }, (_, i) => {
        const s = 6 + rand() * 1.8;
        const outer = block(s, s * (0.85 + rand() * 0.3), rand);
        const parts: Part[] = [];
        if (shape === "tomato" && rand() < 0.5) {
          const c: Pt = [(rand() - 0.5) * s * 0.4, (rand() - 0.5) * s * 0.4];
          parts.push({ role: "gel", pts: circle(s * 0.3, 10, c), closed: true });
          parts.push({ role: "seed", pts: drop(c, rand() * TAU, s * 0.24, s * 0.14), closed: true });
        }
        const skin = rand() < 0.35 ? [outer.slice(0, 3)] : [];
        const [x, y] = spot(i, count, 32, 22, rand);
        return lay({ outer, parts, rind: skin, rindW: 0.9, pithW: 0, face: "flesh", side: "flesh", thick: 3.2 }, { rot: rand() * TAU, x, y });
      });
      return { heap: true, pieces };
    }
    case "minced": {
      if (citrus) {
        /** Zest: fine curls of peel. */
        const pieces = Array.from({ length: 120 }, (_, i): RoundPiece => {
          const len = 2.5 + rand() * 3.5;
          const curl = wob() * 1.6;
          const line: Pt[] = [[-len / 2, 0], [0, curl], [len / 2, curl * 0.3 + wob()]];
          const [x, y] = spot(i, 120, 24, 15, rand);
          return { ...lay({ outer: line, parts: [], rind: [], rindW: 0, pithW: 0, face: "skin", side: "skin", thick: 0.6 }, { rot: rand() * TAU, x, y }, false), strand: 0.75 + rand() * 0.3 };
        });
        return { heap: true, pieces };
      }
      const count = 90;
      const pieces = Array.from({ length: count }, (_, i) => {
        const s = 2.2 + rand() * 1.1;
        const outer = shape === "tomato" ? circle(s * 0.55, 6).map(([x, y]): Pt => [x * (0.8 + rand() * 0.4), y * (0.8 + rand() * 0.4)]) : block(s, s, rand);
        const parts: Part[] = shape === "tomato" && rand() < 0.35 ? [{ role: "gel", pts: outer.map(([x, y]): Pt => [x * 0.7, y * 0.7]), closed: true }] : [];
        const [x, y] = spot(i, count, 24, 15, rand);
        return lay({ outer, parts, rind: rand() < 0.15 ? [outer.slice(0, 2)] : [], rindW: 0.6, pithW: 0, face: "flesh", side: "flesh", thick: 1.4 }, { rot: rand() * TAU, x, y });
      });
      return { heap: true, pieces };
    }
    case "strips": {
      if (citrus) {
        const pieces = Array.from({ length: 9 }, (_, i) => {
          const [x, y] = spot(i, 9, 26, 18);
          return lay({ outer: bentStrip(22 + rand() * 6, 3.6, wob() * 3, 0.5), parts: [], rind: [], rindW: 0, pithW: 0, face: "skin", side: "pith", thick: 1.4 }, { rot: rand() * TAU, x, y });
        });
        return { heap: false, pieces };
      }
      if (shape === "tomato") {
        const pieces = Array.from({ length: 7 }, (_, i) => {
          const [x, y] = spot(i, 7, 26, 18);
          const outer = bentStrip(22 + rand() * 5, 7.5, 2 + rand() * 1.5, 0.35);
          return lay({ outer, parts: [{ role: "core", pts: outer.slice(12).map(([x, y]): Pt => [x * 0.85, y - 1.6]), closed: false, w: 1.2 }], rind: [], rindW: 0, pithW: 0, face: "flesh", side: "skin", thick: 2.2 }, { rot: rand() * TAU, x, y });
        });
        return { heap: false, pieces };
      }
      /** Apple matchsticks, each with a fleck of skin at one end. */
      const pieces = Array.from({ length: 24 }, (_, i) => {
        const len = 18 + rand() * 6;
        const outer = block(len, 2.6, rand);
        const [x, y] = spot(i, 24, 26, 18);
        return lay({ outer, parts: [], rind: [outer.slice(1, 4)], rindW: 0.9, pithW: 0, face: "flesh", side: "flesh", thick: 2.2 }, { rot: wob() * 0.6 + (i % 2 ? 0.5 : -0.4), x, y });
      });
      return { heap: false, pieces };
    }
  }
  throw new Error(`no cut ${cut}`);
}

const size = (p: RoundPiece) => {
  const xs = p.outer.map((q) => q[0]);
  const ys = p.outer.map((q) => q[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
};

/** The piece a scene would scatter: the biggest one, or a small cluster of mince or zest. */
export function representativeRound(result: RoundCut, shape: RoundShape, cut: Exclude<Cut, "whole">): RoundPiece[] {
  if (roundCut(shape, cut) === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: RoundPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, shape === "citrus" || shape === "lemon" ? 14 : 8);
  }
  if (roundCut(shape, cut) === "halved") return [result.pieces[0]!];
  return [result.pieces.reduce((a, b) => (size(b) > size(a) ? b : a))];
}

/** How far each fruit slumps as it softens when cooked: tomatoes most, citrus not at all. */
export const COLLAPSE: Record<RoundShape, number> = { tomato: 0.12, apple: 0.07, citrus: 0, lemon: 0 };

/** Softened pieces pull in and flatten. */
export function wiltRound(p: RoundPiece, k: number): RoundPiece {
  if (!k || p.strand) return p;
  const [cx, cy] = centroid(p.outer);
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * (1 - k * 0.6), cy + (y - cy) * (1 - k * 0.6)]);
  return { ...p, outer: s(p.outer), hole: p.hole && s(p.hole), parts: p.parts.map((q) => ({ ...q, pts: s(q.pts) })), rind: p.rind.map(s), thick: p.thick * (1 - k * 2.5) };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameRound(shape: RoundShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutRound(shape, cut, seed);
  const picked = layout === "piece" ? representativeRound(result, shape, cut) : result.pieces;
  const shown = cooked ? picked.map((p) => wiltRound(p, COLLAPSE[shape])) : picked;
  return { result, ...frameCut(shown, layout === "piece" ? 6 : 1.4, shown.flatMap((p) => p.over.flatMap((o) => o.pts))) };
}
