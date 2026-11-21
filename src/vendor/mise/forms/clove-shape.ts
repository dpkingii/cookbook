import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { jitter, rng, type Pt } from "../core/rough";

/** A whole head of garlic, or one clove. */
export type ClovePart = "head" | "clove";

export interface CloveProps extends ArtProps {
  /** Colour of the papery skin. */
  color?: string;
  /** Colour of the peeled flesh. */
  flesh?: string;
  /** Purple streaks in the skin, as on purple garlic. */
  streak?: string;
  part?: ClovePart;
  /** A single clove with its skin off. A head is always drawn in its skin. */
  peeled?: boolean;
  /** Halved works on a head or a clove. Every other cut is of cloves: wedges draw a smashed clove. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked garlic: peeled (a halved head keeps its skin), softened and browned as far as `browning` says. */
  cooked?: boolean;
  /** Colour of soft cooked garlic before any browning. */
  cookedColor?: string;
  /** 0 is soft and pale (confit), 0.5 golden, 1 deep brown with bitter dark edges: too far. */
  browning?: number;
  seed?: number;
}

function turn([x, y]: Pt, cx: number, cy: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [x - cx, y - cy];
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

export interface HeadGeometry {
  pts: Pt[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Top of the cut stalk, and the middle of the root end. */
  stalk: Pt;
  root: Pt;
  lean: number;
  /** Grooves between the cloves, from the stalk down to the root. */
  grooves: Pt[][];
  bottom: number;
}

/** A head of garlic sitting on its roots: squat and lobed, pinching up to a short cut stalk. */
export function headGeometry(seed: number): HeadGeometry {
  const rand = rng(seed * 19 + 7);
  const [rx, ry, neck] = [36, 28, 7];
  const cx = 50;
  const cy = 56;
  const lean = (rand() * 2 - 1) * 5;
  const lobes = 5 + Math.floor(rand() * 2);
  const phase = rand() * Math.PI;
  const n = 40;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const phi = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const up = Math.max(0, -Math.sin(phi));
    const down = Math.max(0, Math.sin(phi));
    const pinch = up ** 7;
    const lobe = 1 + 0.035 * Math.abs(Math.cos(phi * lobes + phase)) * (1 - pinch);
    const x = rx * Math.cos(phi) * (1 - 0.72 * pinch ** 0.35) * lobe;
    const y = ry * Math.sin(phi) * (1 - 0.16 * down ** 3) * lobe - neck * pinch;
    pts.push(turn([cx + x, cy + y], cx, cy, lean));
  }
  const stalk = turn([cx, cy - ry - neck - 4], cx, cy, lean);
  const grooves = Array.from({ length: lobes - 1 }, (_, j) => {
    const deg = -70 + (140 * (j + 0.5 + (rand() * 2 - 1) * 0.15)) / (lobes - 1);
    const s = Math.sin((deg * Math.PI) / 180);
    const line: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const phi = -Math.PI / 2 + 0.3 + (k / 8) * (Math.PI - 0.55);
      line.push(turn([cx + rx * Math.cos(phi) * s * 1.02, cy + ry * Math.sin(phi) * (1 - 0.1 * Math.max(0, Math.sin(phi)) ** 3)], cx, cy, lean));
    }
    return line;
  });
  const bottom = Math.max(...pts.map((p) => p[1]));
  const root = turn([cx, cy + ry * 0.84], cx, cy, lean);
  root[1] = Math.max(root[1], bottom - 1.5);
  return { pts, cx, cy, rx, ry, stalk, root, lean, grooves, bottom };
}

export interface CloveGeometry {
  pts: Pt[];
  /** The ridge where the curved back meets the side. */
  ridge: Pt[];
  tip: Pt;
  /** Centre of the flat root end. */
  base: Pt;
  lean: number;
  bottom: number;
}

/** One clove standing on its flat root end: a curved back, a flatter belly and a pointed tip. */
export function cloveGeometry(seed: number): CloveGeometry {
  const rand = rng(seed * 23 + 11);
  const [bx, by] = [50, 82];
  const lean = 8 + (rand() * 2 - 1) * 8;
  const s = 1.2;
  const outline: Pt[] = [
    [-11, 0], [-16, -9], [-17, -22], [-12, -35], [-4, -45], [0, -49], [3, -45], [8, -34], [11, -21], [11, -9], [8, 0], [-1, 1.5],
  ];
  const place = (p: Pt[]) => p.map(([x, y]): Pt => turn([bx + x * s, by + y * s], bx, by, lean));
  const pts = place(jitter(outline, 0.6, seed));
  const ridge = place([[-5, -3], [-7, -18], [-5, -33], [-1, -46]]);
  const tip = place([[0, -49]])[0]!;
  const base = place([[-1.5, 0]])[0]!;
  return { pts, ridge, tip, base, lean, bottom: Math.max(...pts.map((p) => p[1])) };
}
