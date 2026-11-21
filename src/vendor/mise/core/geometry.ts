import type { Pt } from "./rough";

/** Points along the same closed Catmull-Rom curve that `smooth` draws, so a soft outline can be cut as a polygon. */
export function sampleClosed(pts: Pt[], per = 6): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k: 0 | 1) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  return out;
}

/** Keeps the part of the polygon where n·p ≤ c (Sutherland–Hodgman against one line). */
export function clip(poly: Pt[], n: Pt, c: number): Pt[] {
  const out: Pt[] = [];
  const side = (p: Pt) => n[0] * p[0] + n[1] * p[1] - c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Whether the point lies inside the polygon (even-odd). */
export function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function area(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

export function centroid(p: Pt[]): Pt {
  const n = p.length || 1;
  return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
}

export function bbox(p: Pt[]) {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { l, r, t, b, cx: (l + r) / 2, cy: (t + b) / 2, w: r - l, h: b - t };
}

export type Box = ReturnType<typeof bbox>;

const r1 = (n: number) => Math.round(n * 10) / 10;

export const polyPath = (p: Pt[]) => `M${p.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L")}Z`;

/** Rotates by `deg` round `c`, then moves by (dx, dy). */
export function place(p: Pt[], c: Pt, deg: number, dx: number, dy: number): Pt[] {
  const a = (deg * Math.PI) / 180;
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  return p.map(([x, y]) => {
    const [ox, oy] = [x - c[0], y - c[1]];
    return [c[0] + ox * cos - oy * sin + dx, c[1] + ox * sin + oy * cos + dy];
  });
}

/** Cuts the polygon into `count` parallel bands whose cut lines run across the direction `angle` (radians). */
export function bands(poly: Pt[], angle: number, count: number, jitter: () => number): Pt[][] {
  const n: Pt = [Math.cos(angle), Math.sin(angle)];
  const proj = poly.map((p) => n[0] * p[0] + n[1] * p[1]);
  const [lo, hi] = [Math.min(...proj), Math.max(...proj)];
  const step = (hi - lo) / count;
  const cuts = [lo - 1, ...Array.from({ length: count - 1 }, (_, i) => lo + step * (i + 1) + jitter() * step * 0.18), hi + 1];
  const out: Pt[][] = [];
  for (let i = 0; i < count; i++) {
    const band = clip(clip(poly, n, cuts[i + 1]!), [-n[0], -n[1]], -cuts[i]!);
    if (band.length >= 3) out.push(band);
  }
  return out;
}

/** Shrinks or grows the polygon round its own centre. */
export function scaleAbout(p: Pt[], k: number): Pt[] {
  const [cx, cy] = centroid(p);
  return p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

/** Lays a shape drawn round (0, 0) onto the counter: rotated, squashed to look flat from a slant, then moved. */
export function layFlat(p: Pt[], rot: number, x: number, y: number, squash = 0.8): Pt[] {
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return p.map(([px, py]) => [x + px * c - py * s, y + (px * s + py * c) * squash]);
}
