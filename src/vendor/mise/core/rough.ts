export type Pt = [number, number];

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom through the points, as cubic Béziers. Keeps hand-cut shapes soft. */
export function smooth(pts: Pt[], closed: boolean): string {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? pts[(i + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  let d = `M${r(at(0)[0])} ${r(at(0)[1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** Nudges each point by up to `amount` in x and y, deterministically for a seed. */
export function jitter(pts: Pt[], amount: number, seed: number): Pt[] {
  const rand = rng(seed);
  return pts.map(([x, y]) => [x + (rand() * 2 - 1) * amount, y + (rand() * 2 - 1) * amount]);
}

/** Points around an ellipse with a hand-cut wobble. */
export function ring(cx: number, cy: number, rx: number, ry: number, seed: number, wobble = 0.06, points = 9): Pt[] {
  const rand = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + rand() * 0.3;
    const k = 1 + (rand() * 2 - 1) * wobble;
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

export const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);
