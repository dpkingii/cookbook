import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { bbox } from "../core/geometry";
import { rng, type Pt } from "../core/rough";

/** Shrimp: a curled tail of shell segments ending in a fan. Prawn: bigger, with its head, eye and long feelers. */
export type CurlShape = "shrimp" | "prawn";

export interface CurlProps extends ArtProps {
  /** Colour of the raw shell: grey-blue, or pink for some prawns. */
  color?: string;
  shape?: CurlShape;
  /** Shell off. The tail fan stays unless `tail` is false. */
  peeled?: boolean;
  tail?: boolean;
  /**
   * halved and strips split it lengthwise; wedges butterfly it open; sliced and rings cut it across into chunks; diced
   * chops it; minced is shrimp paste.
   */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: the flesh turns opaque white with orange-red stripes and the shrimp curls tighter. */
  cooked?: boolean;
  /** Colour of the cooked stripes. */
  cookedColor?: string;
  /** 0 is just poached, 0.5 seared golden in places, 1 charred. */
  browning?: number;
  seed?: number;
}

export const SHELL = "#9aa5a8";

/** One drawn part. A body is a run of segments (whole or a chunk), with its outer half for the stripes. */
export interface CurlPart {
  kind: "body" | "tail" | "head" | "leg" | "feeler" | "bit" | "paste";
  outer: Pt[];
  thick: number;
  /** The outer half of a body, where a cooked shrimp is striped red. */
  band?: Pt[];
  /** Lines between shell segments. */
  segs?: Pt[][];
  /** The dark vein along the back, or the groove left once it is pulled out. */
  vein?: Pt[];
  /** Where a body was cut, showing flesh. */
  faces?: Pt[][];
  /** Line width, for legs and feelers. */
  width?: number;
  /** A chopped bit that is mostly stripe rather than white. */
  red?: boolean;
  group: number;
}

/** The spine of a curled shrimp: from the head end round to the tail, curling tighter as `curl` rises. */
export interface Spine {
  at: (t: number) => Pt;
  /** Unit vector pointing away from the curl's centre, toward the back. */
  out: (t: number) => Pt;
  width: (t: number) => number;
}

export function spine(cx: number, cy: number, R: number, W: number, curl: number, rot: number): Spine {
  const sweep = Math.PI * (0.75 + curl * 0.75);
  const start = rot - sweep / 2;
  const theta = (t: number) => start + t * sweep;
  const r = (t: number) => R * (1 - 0.22 * t);
  return {
    at: (t) => [cx + Math.cos(theta(t)) * r(t), cy + Math.sin(theta(t)) * r(t)],
    out: (t) => [Math.cos(theta(t)), Math.sin(theta(t))],
    width: (t) => W * (1 - 0.58 * t ** 1.25),
  };
}

const N = 28;

/** A run of the body from `a` to `b`: its outline, its outer (striped) half, and the segment lines inside it. */
export function bodyRun(s: Spine, a: number, b: number, capStart: boolean): Pick<CurlPart, "outer" | "band" | "segs" | "vein" | "faces"> {
  const ts = Array.from({ length: N + 1 }, (_, i) => a + ((b - a) * i) / N);
  const side = (k: number) => ts.map((t): Pt => {
    const [x, y] = s.at(t);
    const [ox, oy] = s.out(t);
    const w = (s.width(t) / 2) * k;
    return [x + ox * w, y + oy * w];
  });
  const outerSide = side(1);
  const innerSide = side(-1);
  const mid = side(0.05);
  /** The head end is rounded; anywhere a knife went through is cut straight. */
  const cap: Pt[] = [];
  if (capStart) {
    const [x, y] = s.at(a);
    const [x2, y2] = s.at(a + 0.01);
    const L = Math.hypot(x2 - x, y2 - y) || 1;
    const back: Pt = [(x - x2) / L, (y - y2) / L];
    const [ox, oy] = s.out(a);
    const w = s.width(a) / 2;
    /** From the inner side round the front to the outer side, bulging forward a little less than a half circle. */
    for (let i = 1; i < 8; i++) {
      const f = Math.PI - (i / 8) * Math.PI;
      cap.push([x + ox * w * Math.cos(f) + back[0] * w * 0.8 * Math.sin(f), y + oy * w * Math.cos(f) + back[1] * w * 0.8 * Math.sin(f)]);
    }
  }
  const outer = [...outerSide, ...innerSide.reverse(), ...cap];
  const band = [...outerSide, ...[...mid].reverse()];
  const segs: Pt[][] = [];
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    if (t <= a + 0.01 || t >= b - 0.01) continue;
    const [x, y] = s.at(t);
    const [ox, oy] = s.out(t);
    const w = s.width(t) / 2;
    const [tx, ty] = [-oy, ox];
    segs.push([
      [x - ox * w * 0.95, y - oy * w * 0.95],
      [x + tx * w * 0.18, y + ty * w * 0.18],
      [x + ox * w * 0.95, y + oy * w * 0.95],
    ]);
  }
  const vein = ts.filter((t) => t > 0.04 && t < 0.88).map((t): Pt => {
    const [x, y] = s.at(t);
    const [ox, oy] = s.out(t);
    const w = s.width(t) / 2;
    return [x + ox * w * 0.62, y + oy * w * 0.62];
  });
  const faces: Pt[][] = [];
  const faceAt = (t: number): Pt[] => {
    const [x, y] = s.at(t);
    const [ox, oy] = s.out(t);
    const w = s.width(t) / 2;
    return [
      [x + ox * w, y + oy * w],
      [x - ox * w, y - oy * w],
    ];
  };
  if (!capStart && a > 0.001) faces.push(faceAt(a));
  if (b < 0.999) faces.push(faceAt(b));
  return { outer, band, segs, vein: vein.length > 1 ? vein : undefined, faces };
}

/** The tail fan: a pointed middle blade between two broader side blades, splayed from the last segment. */
export function tailFan(s: Spine, W: number, seed: number): Pt[][] {
  const rand = rng(seed * 17 + 3);
  const [x, y] = s.at(1);
  const [ox, oy] = s.out(1);
  const dir = Math.atan2(ox, -oy);
  const blade = (ang: number, len: number, wid: number): Pt[] =>
    Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const lx = (1 - Math.cos(a)) / 2;
      const ly = Math.sin(a) * (wid / 2) * Math.sin(Math.PI * Math.min(1, lx * 1.1)) ** 0.7;
      const px = lx * len;
      return [x + Math.cos(ang) * px - Math.sin(ang) * ly, y + Math.sin(ang) * px + Math.cos(ang) * ly];
    });
  const L = W * (0.95 + rand() * 0.1);
  return [blade(dir - 0.42, L * 0.9, W * 0.5), blade(dir + 0.42, L * 0.9, W * 0.5), blade(dir, L, W * 0.38)];
}

/** A whole shrimp or prawn as parts, curled, in its own coordinates. */
export function curlParts(shape: CurlShape, seed: number, opts: { curl: number; peeled: boolean; tail: boolean; head: boolean; cx?: number; cy?: number; R?: number; rot?: number; group?: number }): CurlPart[] {
  const prawn = shape === "prawn";
  const R = opts.R ?? 26;
  const W = R * (prawn ? 0.68 : 0.74);
  const s = spine(opts.cx ?? 0, opts.cy ?? 0, R, W, opts.curl, opts.rot ?? 0.25);
  const group = opts.group ?? 0;
  const parts: CurlPart[] = [];
  const shellOn = !opts.peeled;
  if (opts.tail || shellOn) for (const f of tailFan(s, W, seed)) parts.push({ kind: "tail", outer: f, thick: 0.6, group });
  const body = bodyRun(s, 0, 1, true);
  parts.push({ kind: "body", ...body, faces: [], thick: W * 0.12, group });
  if (shellOn) {
    /** Swimmerets: little paired legs along the underside. */
    for (let k = 0; k < 5; k++) {
      const t = 0.1 + k * 0.13;
      const [x, y] = s.at(t);
      const [ox, oy] = s.out(t);
      const w = s.width(t) / 2;
      const [bx, by] = [x - ox * w * 0.9, y - oy * w * 0.9];
      const L = W * 0.38;
      parts.push({ kind: "leg", outer: [[bx, by], [bx - ox * L * 0.6 + oy * L * 0.3, by - oy * L * 0.6 - ox * L * 0.3], [bx - ox * L + oy * L * 0.5, by - oy * L - ox * L * 0.5]], thick: 0, width: 1.1, group });
    }
  }
  if (prawn && opts.head && shellOn) {
    /** The head: a smooth carapace running on from the first segment, a spiked rostrum, a dark eye and long feelers. */
    const [x, y] = s.at(0);
    const [ox, oy] = s.out(0);
    const [tx, ty] = [oy, -ox];
    const L = W * 1.9;
    const head: Pt[] = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const along = (1 - Math.cos(a)) / 2;
      const across = Math.sin(a) * (W / 2) * (1.05 - 0.45 * along);
      return [x + tx * along * L + ox * across, y + ty * along * L + oy * across];
    });
    parts.unshift({ kind: "head", outer: head, thick: W * 0.12, group });
    const tip: Pt = [x + tx * L, y + ty * L];
    parts.push({ kind: "leg", outer: [[tip[0] - tx * 4 + ox * W * 0.3, tip[1] - ty * 4 + oy * W * 0.3], [tip[0] + tx * 6 + ox * W * 0.45, tip[1] + ty * 6 + oy * W * 0.45]], thick: 0, width: 1.4, group });
    const rand = rng(seed * 23 + 1);
    for (const k of [0.35, 0.15]) {
      /** Feelers sweep forward from the head, then arc back over the body. */
      const len = L * (1.1 + rand() * 0.2);
      parts.push({
        kind: "feeler",
        outer: Array.from({ length: 9 }, (_, i): Pt => {
          const f = i / 8;
          const fwd = Math.sin(f * Math.PI * 0.8) * len * 0.45;
          const up = f * len * 0.85;
          return [tip[0] + tx * fwd + ox * (W * k + up), tip[1] + ty * fwd + oy * (W * k + up)];
        }),
        thick: 0,
        width: 0.9,
        group,
      });
    }
    parts.push({ kind: "leg", outer: [[x + tx * L * 0.7 + ox * W * 0.12, y + ty * L * 0.7 + oy * W * 0.12]], thick: 0, width: 3.4, group });
  }
  return parts;
}

/** Shrimp are grey-blue raw; a cooked shrimp curls into a tighter C. */
export const CURL_RAW = 0.25;
export const CURL_COOKED = 0.85;

/** A whole shrimp or prawn fitted to the box. */
export function curlGeometry(shape: CurlShape, seed: number, opts: { peeled: boolean; tail: boolean; cooked: boolean }): CurlPart[] {
  const rand = rng(seed * 31 + 7);
  const parts = curlParts(shape, seed, { curl: opts.cooked ? CURL_COOKED : CURL_RAW, peeled: opts.peeled, tail: opts.tail, head: true, rot: 0.3 + (rand() - 0.5) * 0.3 });
  return fitParts(parts, [84, 76]);
}

export function mapCurl(p: CurlPart, f: (q: Pt) => Pt): CurlPart {
  const go = (pts: Pt[]) => pts.map(f);
  return { ...p, outer: go(p.outer), band: p.band && go(p.band), segs: p.segs?.map(go), vein: p.vein && go(p.vein), faces: p.faces?.map(go) };
}

export function fitParts(parts: CurlPart[], room: Pt): CurlPart[] {
  const b = bbox(parts.flatMap((p) => p.outer));
  const k = Math.min(room[0] / b.w, room[1] / b.h);
  const [cx, cy] = [(b.l + b.r) / 2, (b.t + b.b) / 2];
  return parts.map((p) => ({ ...mapCurl(p, ([x, y]) => [50 + (x - cx) * k, 50 + (y - cy) * k]), width: p.width && p.width * k, thick: p.thick * k }));
}
