import type { Pt } from "./rough";

export interface HeapSpec {
  /** Centre and radii of the heap's footprint on the counter. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** How tall it stands above the footprint's centre. */
  height: number;
  /** Where the peak sits across the heap. */
  px: number;
  /** How lumpy the silhouette is, in box units. */
  bump: number;
}

/**
 * A heap of something loose on the counter, seen from a slant: a cone whose top is rounded off and whose foot
 * spreads out as it settles, standing on an elliptical footprint. `top` runs left to right along the silhouette.
 */
export function heapOutline(rand: () => number, { cx, cy, rx, ry, height, px, bump }: HeapSpec): { top: Pt[]; outline: Pt[] } {
  const waves = [3, 4, 5, 7, 9].map((k) => ({ k, a: (bump * (0.4 + rand())) / Math.sqrt(k), ph: rand() * Math.PI * 2 }));
  const top: Pt[] = Array.from({ length: 41 }, (_, i) => {
    const x = cx - rx + (i / 40) * rx * 2;
    const u = (x - cx) / rx;
    const t = x < px ? (x - px) / (px - (cx - rx)) : (x - px) / (cx + rx - px);
    const h = height * Math.max(0, 1 - Math.abs(t) ** 1.7) ** 1.6;
    const rough = waves.reduce((s, w) => s + w.a * Math.sin(w.k * u * Math.PI + w.ph), 0) * Math.min(1, h / 6);
    return [x, cy - ry * Math.sqrt(Math.max(0, 1 - u * u)) - h - rough];
  });
  const front: Pt[] = Array.from({ length: 23 }, (_, i) => {
    const u = 1 - ((i + 1) / 24) * 2;
    return [cx + u * rx, cy + ry * Math.sqrt(Math.max(0, 1 - u * u))];
  });
  return { top, outline: [...top, ...front] };
}
