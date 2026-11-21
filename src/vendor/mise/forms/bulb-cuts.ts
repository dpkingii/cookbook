import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { rng, type Pt } from "../core/rough";
import { bulbGeometry, type BulbShape } from "./bulb-shape";

/** Pieces lying flat are seen from above at a slant, so their depth is squashed. */
const SQUASH = 0.8;
/** Spacing between onion layers, in box units. */
export const LAYER = 3.4;

/** One cut piece of onion: its outline, an optional hole (a ring), and the layer lines across its face. */
export interface LayerPiece {
  outer: Pt[];
  hole?: Pt[];
  lines: Pt[][];
  /** Layer lines that close on themselves, as on a round slice. */
  closed: boolean;
  thick: number;
  /** The side shows the papery skin, as on a halved onion that hasn't been peeled. */
  skinSide: boolean;
}

export interface BulbCut {
  pieces: LayerPiece[];
  /** Many tiny pieces: one shadow under the heap instead of one per piece. */
  heap: boolean;
}

/** The cut a bulb actually draws: strips come out as half-moon slices. */
export const BULB_CUT: Record<Exclude<Cut, "whole">, Exclude<Cut, "strips" | "whole">> = {
  halved: "halved",
  sliced: "sliced",
  diced: "diced",
  minced: "minced",
  strips: "sliced",
  wedges: "wedges",
  rings: "rings",
};

const arc = (r: number, a0: number, a1: number, n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r * 0.5))): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

/** A band of layers between two radii and two angles, with the layer boundaries inside it. */
function band(rIn: number, rOut: number, a0: number, a1: number, layer: number) {
  const outer = rIn < 0.5 ? [[0, 0] as Pt, ...arc(rOut, a0, a1)] : [...arc(rOut, a0, a1), ...arc(rIn, a1, a0)];
  const lines: Pt[][] = [];
  for (let r = rOut - layer; r > rIn + layer * 0.3; r -= layer) lines.push(arc(r, a0, a1));
  return { outer, lines };
}

function piece(
  shape: { outer: Pt[]; hole?: Pt[]; lines: Pt[][] },
  at: { rot: number; x: number; y: number; squash?: number },
  rest: { closed?: boolean; thick: number; skinSide?: boolean; recentre?: boolean },
): LayerPiece {
  const [cx, cy] = rest.recentre ? centroid(shape.outer) : [0, 0];
  const go = (p: Pt[]) => layFlat(p.map(([x, y]): Pt => [x - cx, y - cy]), at.rot, at.x, at.y, at.squash ?? SQUASH);
  return {
    outer: go(shape.outer),
    hole: shape.hole && go(shape.hole),
    lines: shape.lines.map(go),
    closed: rest.closed ?? false,
    thick: rest.thick,
    skinSide: rest.skinSide ?? false,
  };
}

export function cutBulb(shape: BulbShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean): BulbCut {
  const rand = rng(seed * 17 + 9);
  const wob = () => rand() * 2 - 1;
  const R = shape === "long" ? 20 : 27;

  switch (BULB_CUT[cut]) {
    case "halved": {
      const g = bulbGeometry(shape, seed, true);
      const outline = sampleClosed(g.pts, 5);
      const root: Pt = [g.cx, g.cy + g.ry * 0.78];
      const local = (p: Pt[]) => p.map(([x, y]): Pt => [x - g.cx, y - g.cy]);
      const nests = [0.82, 0.65, 0.49, 0.34, 0.2].map((k) =>
        local(outline.map(([x, y]): Pt => [root[0] + (x - root[0]) * k, root[1] + (y - root[1]) * k])),
      );
      const half = { outer: local(outline), lines: nests.map((n) => [...n, n[0]!]) };
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [-x, y]);
      const gap = g.rx + 5;
      return {
        heap: false,
        pieces: [
          piece(half, { rot: -0.1 + wob() * 0.05, x: -gap, y: 0, squash: 0.86 }, { thick: 7, skinSide: !peeled }),
          piece(
            { outer: mirror(half.outer), lines: half.lines.map(mirror) },
            { rot: 0.1 + wob() * 0.05, x: gap, y: 2, squash: 0.86 },
            { thick: 7, skinSide: !peeled },
          ),
        ],
      };
    }
    case "rings": {
      const discs = [R * 0.7, R * 0.95, R, R * 0.85].map((r, i) => {
        const ring = arc(r, 0, Math.PI * 2).slice(0, -1);
        const lines: Pt[][] = [];
        for (let q = r - LAYER; q > LAYER * 0.6; q -= LAYER) lines.push(arc(q, 0, Math.PI * 2).slice(0, -1));
        return piece({ outer: ring, lines }, { rot: wob(), x: -36 + i * 22, y: wob() * 3 }, { closed: true, thick: 2.6 });
      });
      const loose = [R * 0.9, R * 0.6].map((r, i) =>
        piece(
          { outer: arc(r, 0, Math.PI * 2).slice(0, -1), hole: arc(r - LAYER, 0, Math.PI * 2).slice(0, -1), lines: [] },
          { rot: wob(), x: -14 + i * 34 + wob() * 4, y: 30 + wob() * 3 },
          { closed: true, thick: 2.6 },
        ),
      );
      return { heap: false, pieces: [...discs, ...loose] };
    }
    case "sliced": {
      const pieces = Array.from({ length: 16 }, (_, i) => {
        const rOut = LAYER * (2 + Math.floor(rand() * (R / LAYER - 2)));
        const layers = 1 + Math.floor(rand() * 2);
        const a = i * 2.39996;
        const rad = Math.sqrt((i + 0.5) / 16);
        return piece(band(rOut - LAYER * layers, rOut, Math.PI, Math.PI * 2, LAYER), {
          rot: rand() * Math.PI * 2,
          x: Math.cos(a) * 34 * rad,
          y: Math.sin(a) * 22 * rad,
        }, { thick: 2.2, recentre: true });
      });
      return { heap: false, pieces };
    }
    case "wedges": {
      const span = (Math.PI * 2) / 6;
      const pieces = Array.from({ length: 6 }, (_, i) => {
        const mid = i * span + wob() * 0.25;
        const out = R * 1.25 + wob() * 2;
        return piece(band(0, R * 0.92, -span / 2 + 0.06, span / 2 - 0.06, LAYER), {
          rot: mid + wob() * 0.2,
          x: Math.cos(i * span) * out,
          y: Math.sin(i * span) * out,
        }, { thick: 4.5, recentre: true });
      });
      return { heap: false, pieces };
    }
    case "diced":
    case "minced": {
      const fine = BULB_CUT[cut] === "minced";
      const count = fine ? 80 : 42;
      const pieces = Array.from({ length: count }, (_, i) => {
        const rOut = LAYER * (1.5 + rand() * (R / LAYER - 1.5));
        const depth = fine ? LAYER * 0.8 : LAYER * (1 + Math.floor(rand() * 2));
        const length = fine ? 2.6 + rand() : 6 + rand() * 2;
        const a0 = rand() * Math.PI * 2;
        const a = i * 2.39996;
        const rad = Math.sqrt((i + 0.5) / count);
        const spread = fine ? [24, 15] : [32, 21];
        return piece(band(rOut - depth, rOut, a0, a0 + length / rOut, LAYER), {
          rot: rand() * Math.PI * 2,
          x: Math.cos(a) * spread[0]! * rad,
          y: Math.sin(a) * spread[1]! * rad - (1 - rad) * 3,
        }, { thick: fine ? 1.4 : 2.2, recentre: true });
      });
      return { heap: true, pieces };
    }
  }
}

/** The piece a scene would scatter: the biggest one, or a small cluster of mince. */
export function representativeBulb(result: BulbCut, cut: Exclude<Cut, "whole">): LayerPiece[] {
  if (BULB_CUT[cut] === "minced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: LayerPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 8);
  }
  const size = (p: LayerPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  return [result.pieces.reduce((a, b) => (size(b) > size(a) ? b : a))];
}

/** Cooked onion collapses: each piece pulls in and flattens. */
export function wiltBulb(p: LayerPiece): LayerPiece {
  const [cx, cy] = centroid(p.outer);
  const k = 0.88;
  const s = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + (x - cx) * k, cy + (y - cy) * k]);
  return { ...p, outer: s(p.outer), hole: p.hole && s(p.hole), lines: p.lines.map(s), thick: p.thick * 0.7 };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameBulb(shape: BulbShape, cut: Exclude<Cut, "whole">, seed: number, peeled: boolean, layout: Layout, cooked: boolean) {
  const result = cutBulb(shape, cut, seed, peeled);
  const picked = layout === "piece" ? representativeBulb(result, cut) : result.pieces;
  return { result, ...frameCut(cooked ? picked.map(wiltBulb) : picked, layout === "piece" ? 6 : 1.4) };
}
