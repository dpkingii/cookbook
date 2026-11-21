import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { area, bands, bbox, centroid, place, sampleClosed, scaleAbout } from "../core/geometry";
import { jitter, ring, rng, type Pt } from "../core/rough";

/** The outline seen from above: a chicken thigh is organic, a steak an oval, a fish fillet tapers, tofu is a block. */
export type SlabOutline = "organic" | "oval" | "taper" | "block";
/** What shows on the cut face. */
export type SlabSurface = "plain" | "fatty" | "marbled" | "flaky";

export interface SlabProps extends ArtProps {
  color: string;
  outline?: SlabOutline;
  surface?: SlabSurface;
  /** Colour of fat, marbling or flake lines. */
  fat?: string;
  /** A band of fat along one edge, as on a steak or pork chop. */
  rim?: boolean;
  cut?: Cut;
  layout?: Layout;
  /** Drawn cooked: the cooked colour, a seared crust, golden fat, oil instead of a wet shine, slightly shrunk. */
  cooked?: boolean;
  /** Colour of the cooked food. Defaults to the raw colour pulled toward golden brown. */
  cookedColor?: string;
  /** How browned the cooked surface is, 0 to 1. */
  sear?: number;
  seed?: number;
}

/** Cooked meat pulls in a little and stands a little taller. */
export const SHRINK = 0.92;

export { SHADE } from "../core/color";

export const THICK: Record<SlabOutline, number> = { organic: 8, oval: 9, taper: 7, block: 14 };

/** Control points of the outline; the soft outlines are drawn as a Catmull-Rom curve through them. */
export function face(outline: SlabOutline, seed: number): Pt[] {
  switch (outline) {
    case "organic":
      return ring(50, 44, 36, 23, seed, 0.16, 10);
    case "oval":
      return ring(50, 44, 37, 24, seed, 0.05, 12);
    case "taper":
      return jitter(
        [[10, 48], [20, 35], [42, 28], [66, 29], [84, 35], [92, 44], [84, 53], [62, 59], [36, 59], [18, 56]],
        1.5,
        seed,
      );
    case "block":
      return jitter([[16, 30], [84, 30], [84, 58], [16, 58]], 0.8, seed);
  }
}

/** The outline as a dense polygon, so it can be cut with straight lines. */
export function outlinePolygon(outline: SlabOutline, seed: number): Pt[] {
  const pts = face(outline, seed);
  return outline === "block" ? pts : sampleClosed(pts, 6);
}

/** One piece: its outline where it was cut from the whole, and the move that puts it in the pile. */
export interface Piece {
  pts: Pt[];
  dx: number;
  dy: number;
  rot: number;
}

export interface CutResult {
  pieces: Piece[];
  thick: number;
  /** Many tiny pieces: draw one shadow under the heap instead of one per piece. */
  heap: boolean;
}

/** The cut a slab actually draws: wedges come out as dice and rings as slices. */
export const SLAB_CUT: Record<Cut, Exclude<Cut, "wedges" | "rings">> = {
  whole: "whole",
  halved: "halved",
  sliced: "sliced",
  diced: "diced",
  minced: "minced",
  strips: "strips",
  wedges: "diced",
  rings: "sliced",
};

export function cutSlab(outline: SlabOutline, requested: Cut, seed: number): CutResult {
  const poly = outlinePolygon(outline, seed);
  const thick = THICK[outline];
  const rand = rng(seed * 31 + 5);
  const wobble = () => rand() * 2 - 1;
  const box = bbox(poly);
  const mid = centroid(poly);
  const spread = (bandsOf: Pt[][], gap: number, turn: number, slide = 0): Piece[] =>
    bandsOf.map((pts, i) => ({
      pts,
      dx: (i - (bandsOf.length - 1) / 2) * gap,
      dy: wobble() * slide,
      rot: wobble() * turn,
    }));

  switch (SLAB_CUT[requested]) {
    case "whole":
      return { pieces: [{ pts: poly, dx: 0, dy: 0, rot: 0 }], thick, heap: false };
    case "halved":
      return { pieces: spread(bands(poly, wobble() * 0.15, 2, wobble), 7, 4), thick, heap: false };
    case "sliced":
      return { pieces: spread(bands(poly, wobble() * 0.12, 6, wobble), 3.6, 3, 1), thick, heap: false };
    case "strips":
      return { pieces: spread(bands(poly, wobble() * 0.1, 10, wobble), 3.4, 24, 7), thick: thick * 0.85, heap: false };
    case "diced": {
      const cols = 5;
      const rows = outline === "block" ? 2 : 3;
      const cells = bands(poly, wobble() * 0.08, cols, wobble).flatMap((col) =>
        bands(col, Math.PI / 2 + wobble() * 0.08, rows, wobble),
      );
      const sizes = cells.map(area).sort((a, b) => a - b);
      const typical = sizes[Math.floor(sizes.length / 2)] ?? 1;
      const kept = cells.filter((c) => area(c) > typical * 0.3);
      const pieces = kept.map((pts) => {
        const c = centroid(pts);
        return { pts, dx: (c[0] - mid[0]) * 0.2 + wobble() * 1.4, dy: (c[1] - mid[1]) * 0.28 + wobble() * 1.4, rot: wobble() * 14 };
      });
      return { pieces, thick: Math.min(thick * 1.4, Math.sqrt(typical) * 0.85), heap: false };
    }
    case "minced": {
      const pieces: Piece[] = Array.from({ length: 48 }, (_, i) => {
        const a = i * 2.39996 + wobble() * 0.4;
        const rad = Math.sqrt((i + 0.5) / 48);
        const [x, y] = [mid[0] + Math.cos(a) * box.w * 0.34 * rad, mid[1] + Math.sin(a) * box.h * 0.42 * rad];
        const crumb = sampleClosed(ring(x, y, 2.6 + rand() * 1.8, 2 + rand() * 1.4, seed + i * 7, 0.35, 6), 3);
        return { pts: crumb, dx: 0, dy: -(1 - rad) * 4, rot: 0 };
      });
      return { pieces, thick: 3, heap: true };
    }
  }
}

/** The piece a scene would scatter: the biggest one, or a small cluster of mince. */
export function representative(result: CutResult): Piece[] {
  if (result.heap) {
    const mid = centroid(result.pieces.flatMap((p) => p.pts));
    return [...result.pieces]
      .sort((a, b) => dist(centroid(a.pts), mid) - dist(centroid(b.pts), mid))
      .slice(0, 7);
  }
  const best = result.pieces.reduce((a, b) => (area(b.pts) > area(a.pts) ? b : a));
  return [{ ...best, dx: 0, dy: 0 }];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Where each piece ends up: rotated round its own centre, then moved. */
export const placed = (p: Piece): Pt[] => place(p.pts, centroid(p.pts), p.rot, p.dx, p.dy);

/** The pieces as drawn for this cut and layout, cooked or not, their thickness, and the zoom that fits them in the box. */
export function frameSlab(outline: SlabOutline, cut: Cut, seed: number, layout: Layout, cooked: boolean) {
  const result = cutSlab(outline, cut, seed);
  const picked = layout === "piece" ? representative(result) : result.pieces;
  const pieces = cooked ? picked.map((p) => ({ ...p, pts: scaleAbout(p.pts, SHRINK) })) : picked;
  const thick = result.thick * (cooked ? 1.08 : 1);
  const spots = pieces.flatMap(placed);
  const fit = bbox([...spots, ...spots.map(([x, y]): Pt => [x, y + thick + 3])]);
  return { result, pieces, thick, fit, k: Math.min(layout === "piece" ? 6 : 1.05, 82 / fit.w, 76 / fit.h) };
}
