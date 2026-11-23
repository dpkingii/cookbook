import { bbox, centroid, type Box } from "./geometry";
import type { Pt } from "./rough";

/** Cut pieces placed for drawing: the pieces as drawn, their bounds, and the zoom `k` that fits them in the box. */
export interface Framed<P> {
  pieces: P[];
  fit: Box;
  k: number;
}

/**
 * Zooms a pile or a piece to fill the box, up to `cap`: the bounds take in each piece's thickness below it and any
 * `extra` points (a stem, torn skin, a pool of juice). Every cut form frames through here, so what is drawn and what
 * `boxCm` measures are the same thing.
 */
export function frameCut<P extends { outer: Pt[]; thick: number }>(raw: P[], cap: number, rawExtra: Pt[] = [], room: Pt = [84, 76]): Framed<P> {
  const pieces = snap(raw);
  const extra = snap(rawExtra);
  const fit = bbox([...pieces.flatMap((p) => [...p.outer, ...p.outer.map(([x, y]): Pt => [x, y + p.thick + 3])]), ...extra]);
  return { pieces, fit, k: Math.min(cap, room[0] / fit.w, room[1] / fit.h) };
}

/**
 * Rounds every number in a piece to a thousandth. `**`, `sin` and the like can differ in the last bit between Node and
 * a browser (or between V8's tiers), so a server-rendered drawing would not hydrate; after snapping, everything derived
 * from the piece is plain arithmetic, which is the same everywhere.
 */
export function snap<T>(v: T): T {
  if (typeof v === "number") return (Math.round(v * 1000) / 1000) as T;
  if (Array.isArray(v)) return v.map(snap) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, snap(x)])) as T;
  return v;
}

/**
 * How long a flat piece is, and how wide across, with the slant that laid it on the counter (`squash`) taken back out:
 * the longest and shortest widths of its outline over every direction.
 */
export function calipers(poly: Pt[], squash = 0.8): { long: number; across: number } {
  const [, cy] = centroid(poly);
  const flat = poly.map(([x, y]): Pt => [x, cy + (y - cy) / squash]);
  let long = 0;
  let across = Infinity;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const proj = flat.map(([x, y]) => x * c + y * s);
    const w = Math.max(...proj) - Math.min(...proj);
    long = Math.max(long, w);
    across = Math.min(across, w);
  }
  return { long, across };
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
