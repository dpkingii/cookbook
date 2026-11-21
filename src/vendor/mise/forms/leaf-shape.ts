import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { bbox, place } from "../core/geometry";
import { rng, type Pt } from "../core/rough";

/**
 * Leafy food. Cilantro (and flat-leaf parsley): a loose bunch of thin stems ending in round, lobed leaflets. Basil (and
 * mint): a sprig of glossy oval leaves in pairs. Spinach: a bunch of dark spade-shaped leaves on long stems. Bok choy:
 * pale spoon-shaped stalks fanning into dark green leaves. Cabbage: a tight ball wrapped in looser outer leaves.
 */
export type LeafShape = "cilantro" | "basil" | "spinach" | "bokchoy" | "cabbage";

export interface LeafProps extends ArtProps {
  /** Colour of the green leaf (the purple of a red cabbage). */
  color: string;
  /** Colour of the stems, the pale stalks of bok choy, and a cabbage's ribs and core. */
  rib?: string;
  /** The pale inside of a cut cabbage or bok choy. */
  heart?: string;
  shape?: LeafShape;
  /**
   * Halved and wedges cut a bok choy or cabbage through its core; on herbs and spinach they pick the leaves off. Strips,
   * sliced and rings shred basil, spinach and cabbage into ribbons and roughly chop the rest; diced chops finely.
   */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: leaves wilt, shrink and darken, bok choy stalks turn translucent, and seared faces brown. */
  cooked?: boolean;
  /** Colour of the cooked leaf before any browning. */
  cookedColor?: string;
  /** 0 is just wilted, 0.5 seared golden where it touched the pan, 1 charred. */
  browning?: number;
  seed?: number;
}

export const RIB: Record<LeafShape, string> = { cilantro: "#86b450", basil: "#7aa645", spinach: "#93b860", bokchoy: "#eef2d6", cabbage: "#e8efc6" };

/**
 * One drawn part of a leafy food. A `blade` is a leaf or a piece of one, `pale` mixing it toward the stalk colour (a bok
 * choy stalk is a fully pale blade). A `face` is the cut inside of a head. A `stem` is a thin herb stem, drawn as a line
 * along `outer`.
 */
export interface LeafPart {
  kind: "blade" | "face" | "stem";
  outer: Pt[];
  thick: number;
  /** -1 darker to 1 lighter, so overlapping leaves read apart. */
  tone: number;
  pale?: number;
  /** The midrib and side veins, or a stalk's ridges. */
  veins?: Pt[][];
  /** A stem's width, or a pale midrib's width. */
  width?: number;
  /** On a cut face: the leaf layers seen edge-on, and the pale core. */
  layers?: Pt[][];
  core?: Pt[];
  /** On a cut bok choy: the green leafy end of the face. */
  green?: Pt[];
  /** Parts that belong to one piece (a leaflet and its stem) share a group. */
  group: number;
}

export function mapPart(p: LeafPart, f: (q: Pt) => Pt): LeafPart {
  const go = (pts: Pt[]) => pts.map(f);
  return {
    ...p,
    outer: go(p.outer),
    veins: p.veins?.map(go),
    layers: p.layers?.map(go),
    core: p.core && go(p.core),
    green: p.green && go(p.green),
  };
}

export interface BladeSpec {
  len: number;
  wid: number;
  /** Where along the leaf it is widest, 0 at the stem to 1 at the tip. */
  peak: number;
  /** Below 1 the leaf is rounder and fuller; above 1, slimmer and more pointed. */
  blunt: number;
  /** Saw teeth along each side, pointing to the tip, and how deep they cut. */
  teeth?: number;
  bite?: number;
  /** How far the midrib bows to one side. */
  curl?: number;
  /** A wavy, puckered edge, as on savoy spinach. */
  crinkle?: number;
  /** Side veins on each side; none for small pieces. */
  veins?: number;
}

/** A leaf blade from its stem end at (0, 0) to its tip at (len, 0), with its midrib and side veins. */
export function blade(s: BladeSpec, seed: number): { outline: Pt[]; mid: Pt[]; veins: Pt[][] } {
  const rand = rng(seed * 17 + 5);
  const p = Math.log(0.5) / Math.log(s.peak);
  const bow = (s.curl ?? 0) * s.len * 0.12;
  const phase = rand() * 6;
  const axis = (t: number): Pt => [s.len * t, bow * Math.sin(Math.PI * t)];
  const half = (t: number, side: number) => {
    const base = (s.wid / 2) * Math.sin(Math.PI * Math.min(1, t ** p)) ** s.blunt;
    const tooth = s.teeth ? 1 - (s.bite ?? 0.1) * ((t * s.teeth + (side > 0 ? 0 : 0.5)) % 1) : 1;
    const crinkle = 1 + (s.crinkle ?? 0) * Math.sin(t * 19 + phase + side * 2);
    return base * tooth * crinkle;
  };
  const N = 22;
  const side = (sgn: number) =>
    Array.from({ length: N + 1 }, (_, i): Pt => {
      const t = i / N;
      const [x, y] = axis(t);
      return [x, y + sgn * half(t, sgn)];
    });
  const outline = [...side(1), ...side(-1).reverse().slice(1, -1)];
  const mid = Array.from({ length: 9 }, (_, i) => axis((i / 8) * 0.94));
  const veins: Pt[][] = [];
  const n = s.veins ?? 0;
  for (let i = 0; i < n; i++) {
    const t = 0.14 + (i / Math.max(1, n)) * 0.66;
    for (const sgn of [1, -1]) {
      const t2 = Math.min(0.97, t + 0.2);
      const [x0, y0] = axis(t);
      const [x2, y2] = axis(t2);
      const reach = half(t2, sgn) * 0.82;
      veins.push([
        [x0, y0],
        [(x0 + x2) / 2, (y0 + y2) / 2 + sgn * reach * 0.62],
        [x2, y2 + sgn * reach],
      ]);
    }
  }
  return { outline, mid, veins };
}

/**
 * A cilantro or parsley leaflet: three rounded lobes, toothed, with its stem end at (0, 0) and its tip toward +x.
 * Parsley's teeth are sharper.
 */
export function leaflet(r: number, seed: number, sharp = false): Pt[] {
  const rand = rng(seed * 29 + 11);
  const tilt = (rand() - 0.5) * 0.4;
  const N = 72;
  const pts = Array.from({ length: N }, (_, i): Pt => {
    const a = -Math.PI + (i / N) * Math.PI * 2;
    const lobes = 0.8 + 0.2 * Math.cos(3 * (a + tilt)) - 0.25 * Math.max(0, -Math.cos(a)) ** 3;
    const saw = (Math.abs(Math.sin(a * 8 + seed)) ** (sharp ? 3 : 0.5)) * (sharp ? 0.12 : 0.045);
    const k = r * lobes * (1 - saw) * (0.95 + rand() * 0.06);
    return [Math.cos(a) * k, Math.sin(a) * k * 0.92];
  });
  return pts.map(([x, y]): Pt => [x + r * 0.36, y]);
}

/** A thin stem from `a` to `b`, bowed sideways by `bow`. */
function stemLine(a: Pt, b: Pt, bow: number): Pt[] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / L, dx / L];
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const s = Math.sin(Math.PI * t) * bow;
    return [a[0] + dx * t + nx * s, a[1] + dy * t + ny * s] as Pt;
  });
}

const deg = (r: number) => (r * 180) / Math.PI;

/** A blade placed with its stem end at `at`, pointing toward `angle` (radians). */
export function bladePart(spec: BladeSpec, seed: number, at: Pt, angle: number, extra: Partial<LeafPart> & { group: number }): LeafPart {
  const b = blade(spec, seed);
  const go = (pts: Pt[]) => place(pts, [0, 0], deg(angle), at[0], at[1]);
  return { kind: "blade", outer: go(b.outline), thick: 0.6, tone: 0, veins: [go(b.mid), ...b.veins.map(go)], ...extra };
}

/** A herb leaflet with its own short stem, the two sharing a group. */
export function sprigTip(at: Pt, angle: number, r: number, seed: number, group: number, stemLen: number, sharp: boolean, tone: number): LeafPart[] {
  const end: Pt = [at[0] + Math.cos(angle) * stemLen, at[1] + Math.sin(angle) * stemLen];
  const leaf = place(leaflet(r, seed, sharp), [0, 0], deg(angle), end[0], end[1]);
  const vein = place(
    [
      [0, 0],
      [r * 0.9, 0],
    ],
    [0, 0],
    deg(angle),
    end[0],
    end[1],
  );
  return [
    { kind: "stem", outer: stemLine(at, end, stemLen * 0.08), thick: 0.4, tone: 0, width: 0.9, group },
    { kind: "blade", outer: leaf, thick: 0.4, tone, veins: [vein], group },
  ];
}

function cilantroBunch(seed: number): LeafPart[] {
  const rand = rng(seed * 41 + 3);
  const wob = () => rand() * 2 - 1;
  const parts: LeafPart[] = [];
  const n = 5;
  let group = 0;
  for (let i = 0; i < n; i++) {
    const a = -0.7 + (i / (n - 1)) * 0.9 + wob() * 0.06;
    const L = 52 + rand() * 16;
    const end: Pt = [Math.cos(a) * L, Math.sin(a) * L];
    const stem = stemLine([wob() * 1.5, wob() * 1.5], end, wob() * 3);
    parts.push({ kind: "stem", outer: stem, thick: 0.5, tone: 0, width: 1.5, group: group++ });
    /** Each stem forks into three leaflets at its end, and puts out one side shoot of two further down. */
    for (const [da, r] of [
      [-0.7, 10],
      [0, 12],
      [0.7, 10],
    ] as const)
      parts.push(...sprigTip(end, a + da + wob() * 0.12, r * (0.9 + rand() * 0.2), seed * 100 + group, group++, 5 + rand() * 3, false, wob() * 0.5));
    const mid = stem[3]!;
    const side = i % 2 ? 1 : -1;
    for (const da of [0.5, 0.95])
      parts.push(...sprigTip(mid, a + side * da, 8.5 + rand() * 2, seed * 100 + group, group++, 6 + rand() * 3, false, wob() * 0.5));
  }
  return parts;
}

/** Basil leaves: glossy, cupped ovals with a pointed tip and arching veins. */
export const BASIL: BladeSpec = { len: 26, wid: 15, peak: 0.42, blunt: 0.85, curl: 0.25, veins: 4 };

function basilSprig(seed: number): LeafPart[] {
  const rand = rng(seed * 43 + 9);
  const wob = () => rand() * 2 - 1;
  const parts: LeafPart[] = [];
  const end: Pt = [66, -12];
  const stem = stemLine([0, 0], end, 2 + wob() * 2);
  parts.push({ kind: "stem", outer: stem, thick: 0.6, tone: 0, width: 2.6, group: 0 });
  let group = 1;
  const along = (t: number): Pt => {
    const i = Math.min(5, Math.floor(t * 6));
    const f = t * 6 - i;
    const [a, b] = [stem[i]!, stem[i + 1]!];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const dir = Math.atan2(end[1], end[0]);
  /** Leaves come in opposite pairs, each pair turned a quarter from the last, smaller toward the top. */
  for (const [t, k] of [
    [0.3, 1.05],
    [0.58, 0.9],
    [0.8, 0.7],
  ] as const)
    for (const side of [-1, 1]) {
      const spread = (t === 0.58 ? 0.85 : 1.05) + wob() * 0.1;
      parts.push(
        bladePart({ ...BASIL, len: BASIL.len * k, wid: BASIL.wid * k, curl: side * 0.3 }, seed * 10 + group, along(t), dir + side * spread, {
          group: group++,
          tone: side * 0.25 + wob() * 0.15,
        }),
      );
    }
  for (const [da, k] of [
    [-0.45, 0.42],
    [0.45, 0.42],
    [0, 0.5],
  ] as const)
    parts.push(bladePart({ ...BASIL, len: BASIL.len * k, wid: BASIL.wid * k * 0.85, veins: 2 }, seed * 10 + group, end, dir + da, { group: group++, tone: 0.35 }));
  return parts;
}

/** Spinach: a dark, puckered spade of a leaf, widest near its stem, with pale veins. */
export const SPINACH: BladeSpec = { len: 38, wid: 26, peak: 0.36, blunt: 0.62, crinkle: 0.05, veins: 4 };

function spinachBunch(seed: number): LeafPart[] {
  const rand = rng(seed * 47 + 1);
  const wob = () => rand() * 2 - 1;
  const parts: LeafPart[] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = -1.05 + (i / (n - 1)) * 1.5 + wob() * 0.1;
    const L = 24 + rand() * 12;
    const end: Pt = [Math.cos(a) * L, Math.sin(a) * L];
    parts.push({ kind: "stem", outer: stemLine([0, 0], end, wob() * 2), thick: 0.6, tone: 0, width: 2.4, group: i });
    parts.push(
      bladePart({ ...SPINACH, len: SPINACH.len * (0.85 + rand() * 0.3), curl: wob() * 0.5 }, seed * 10 + i, [end[0] - Math.cos(a) * 2, end[1] - Math.sin(a) * 2], a + wob() * 0.15, {
        group: i,
        tone: (i % 2 ? 0.2 : -0.15) + wob() * 0.1,
      }),
    );
  }
  /** Back leaves first, so the lower, nearer ones overlap them. */
  return parts.sort((p, q) => Math.min(...p.outer.map((x) => x[1])) - Math.min(...q.outer.map((x) => x[1])) || (p.kind === "stem" ? -1 : 1));
}

/** A bok choy stalk: a pale spoon that widens from the base, cupped, with ridges along it. */
export function stalk(len: number, w0: number, w1: number, seed: number): { outline: Pt[]; ridges: Pt[][] } {
  const rand = rng(seed * 7 + 2);
  const N = 14;
  /** It widens up the stalk, then narrows again into the leaf's midrib. */
  const w = (t: number) => (t < 0.7 ? w0 + (w1 - w0) * (t / 0.7) ** 0.8 : w1 - (w1 - w0 * 0.45) * ((t - 0.7) / 0.3) ** 1.4);
  const top = Array.from({ length: N + 1 }, (_, i): Pt => [(i / N) * len, -w(i / N) / 2]);
  const bottom = Array.from({ length: N + 1 }, (_, i): Pt => [(1 - i / N) * len, w(1 - i / N) / 2]);
  /** The stalk's base is rounded off where it was cut from the root. */
  const butt = Array.from({ length: 5 }, (_, i): Pt => {
    const a = Math.PI / 2 + ((i + 1) / 6) * Math.PI;
    return [Math.cos(a) * w0 * 0.3, Math.sin(a) * (w0 / 2)];
  });
  const ridges = [-0.25, 0.05, 0.3].map((f) =>
    Array.from({ length: 6 }, (_, i): Pt => {
      const t = 0.08 + (i / 5) * 0.88;
      return [t * len, f * w(t) + (rand() - 0.5) * 0.4];
    }),
  );
  return { outline: [...top, ...bottom, ...butt], ridges };
}

/** Bok choy's leaf: a broad, rounded spoon of dark green, its pale midrib running on from the stalk. */
export const BOKCHOY: BladeSpec = { len: 46, wid: 34, peak: 0.55, blunt: 0.5, crinkle: 0.03, veins: 4 };

export function bokchoyStalk(at: Pt, angle: number, k: number, seed: number, group: number, tone: number): LeafPart[] {
  const L = 50 * k;
  const s = stalk(L, 8 * k, 15 * k, seed);
  const go = (pts: Pt[]) => place(pts, [0, 0], deg(angle), at[0], at[1]);
  const leaf = blade({ ...BOKCHOY, len: BOKCHOY.len * k, wid: BOKCHOY.wid * k }, seed);
  const lgo = (pts: Pt[]) => go(pts.map(([x, y]): Pt => [x + L * 0.55, y]));
  return [
    { kind: "blade", outer: lgo(leaf.outline), thick: 0.6, tone, veins: [lgo(leaf.mid), ...leaf.veins.map(lgo)], width: 3.2 * k, group },
    { kind: "blade", outer: go(s.outline), thick: 2.5 * k, tone, pale: 1, veins: s.ridges.map(go), group },
  ];
}

function bokchoyHead(seed: number): LeafPart[] {
  const rand = rng(seed * 53 + 5);
  const wob = () => rand() * 2 - 1;
  const parts: LeafPart[] = [];
  /** Inner stalks behind, outer ones in front and slightly lower, all from one base. */
  const fan = [-0.2, 0.12, -0.08, 0.2, 0.02];
  fan.forEach((a, i) => {
    parts.push(...bokchoyStalk([wob() * 1.5, (i - 2) * 1.6], a + wob() * 0.04, 0.92 + (i % 2) * 0.1 + rand() * 0.06, seed * 10 + i, i, -0.25 + i * 0.12));
  });
  return parts;
}

/** A head of cabbage: a tight ball of pale leaves, cupped from below by darker, looser outer leaves with thick pale ribs. */
function cabbageHead(seed: number): LeafPart[] {
  const rand = rng(seed * 59 + 7);
  const wob = () => rand() * 2 - 1;
  const R = 36;
  const ball: Pt[] = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    const k = 1 + 0.025 * Math.sin(a * 3 + seed) + 0.015 * Math.sin(a * 7 + seed * 2);
    return [Math.cos(a) * R * k, Math.sin(a) * R * 0.94 * k];
  });
  /** The edges of the wrapping leaves cross the ball as gentle arcs, and their ribs fan up from the stem below. */
  const margins = [-0.55, -0.15, 0.25].map((y0, j) =>
    Array.from({ length: 13 }, (_, i): Pt => {
      const x = (-0.92 + (i / 12) * 1.84 + (j % 2 ? 0.05 : -0.05)) * R;
      const y = (y0 + 0.32 * (x / R) ** 2 + 0.04 * Math.sin(i * 1.7 + seed)) * R;
      return [x, y];
    }).filter(([x, y]) => x * x + (y / 0.94) ** 2 < (R * 0.97) ** 2),
  );
  const stemAt: Pt = [2, R * 0.92];
  const ribs = [-0.6, -0.1, 0.45].map((f) => {
    const tip: Pt = [f * R * 0.95, -R * (0.35 + 0.35 * Math.cos(f * 1.2))];
    return Array.from({ length: 7 }, (_, i): Pt => {
      const t = i / 6;
      return [stemAt[0] + (tip[0] - stemAt[0]) * t + f * R * 0.35 * Math.sin(Math.PI * t), stemAt[1] + (tip[1] - stemAt[1]) * t];
    });
  });
  const ballPart: LeafPart = { kind: "blade", outer: ball, thick: 0, tone: 0.3, veins: ribs, layers: margins, group: 0 };
  const outer = (a: number, side: number, len: number, wid: number, seedK: number, tone: number) =>
    bladePart({ len, wid, peak: 0.6, blunt: 0.45, crinkle: 0.05, curl: side * 0.35, veins: 4 }, seed * 10 + seedK, [stemAt[0] + side * 4, stemAt[1] - 4], a + wob() * 0.08, { group: 0, tone, width: 3.4 });
  /** Loose outer leaves splay out behind the ball on each side, cupping it. */
  return [outer(-Math.PI + 0.7, -1, 56, 46, 1, -0.35), outer(-0.7, 1, 56, 46, 2, -0.35), ballPart];
}

const WHOLE: Record<LeafShape, (seed: number) => LeafPart[]> = {
  cilantro: cilantroBunch,
  basil: basilSprig,
  spinach: spinachBunch,
  bokchoy: bokchoyHead,
  cabbage: cabbageHead,
};

/** The whole food lying on the counter, fitted to the box. */
export function leafGeometry(shape: LeafShape, seed: number): LeafPart[] {
  const parts = WHOLE[shape](seed);
  /** Herbs and greens lie slanted, stems to the lower left; a cabbage sits upright. */
  const tilt = shape === "cabbage" ? 0 : shape === "bokchoy" ? -18 : -8;
  const turned = parts.map((p) => mapPart(p, (q) => place([q], [0, 0], tilt, 0, 0)[0]!));
  const b = bbox(turned.flatMap((p) => p.outer));
  const k = Math.min(84 / b.w, 76 / b.h);
  const cx = (b.l + b.r) / 2;
  const cy = (b.t + b.b) / 2;
  return turned.map((p) => {
    const q = mapPart(p, ([x, y]) => [50 + (x - cx) * k, 50 + (y - cy) * k]);
    return { ...q, width: p.width && p.width * k, thick: p.thick * k };
  });
}
