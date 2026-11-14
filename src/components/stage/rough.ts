export type Pt = [number, number];

export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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
  const at = (i: number) =>
    closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

export function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  wobble = 0.06,
  points = 9,
  rotate = 0,
): string {
  const rand = rng(seed);
  const pts: Pt[] = [];
  const cr = Math.cos(rotate);
  const sr = Math.sin(rotate);
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + rand() * 0.3;
    const k = 1 + (rand() * 2 - 1) * wobble;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return smooth(pts, true);
}

/** Points spread evenly-ish inside an ellipse, deterministic for a seed. */
export function scatter(
  n: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
): Pt[] {
  const rand = rng(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const rad = Math.sqrt((i + 0.5) / n) * (0.85 + rand() * 0.15);
    const a = i * golden + rand() * 0.8;
    out.push([cx + Math.cos(a) * rx * rad, cy + Math.sin(a) * ry * rad]);
  }
  return out;
}

/** Path for the lower half of an ellipse joined to another lower half: a vessel's visible wall. */
export function wall(
  cx: number,
  top: { y: number; rx: number },
  bottom: { y: number; rx: number; ry: number },
  topRy: number,
): string {
  return (
    `M${cx - top.rx} ${top.y}L${cx - bottom.rx} ${bottom.y}` +
    `A${bottom.rx} ${bottom.ry} 0 0 0 ${cx + bottom.rx} ${bottom.y}` +
    `L${cx + top.rx} ${top.y}A${top.rx} ${topRy} 0 0 1 ${cx - top.rx} ${top.y}Z`
  );
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}
