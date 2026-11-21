import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/** A round onion, a squat red onion, or a long shallot. */
export type BulbShape = "round" | "squat" | "long";

export interface BulbProps extends ArtProps {
  /** Colour of the papery skin. */
  color: string;
  /** Colour of the flesh under the skin. */
  flesh?: string;
  /** Tint of the layer lines in the flesh, as on a red onion. */
  ring?: string;
  shape?: BulbShape;
  /** Skin off, showing the glossy flesh. */
  peeled?: boolean;
  /** Any cut but whole shows the layered flesh. Strips draw as half-moon slices. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked onion: peeled, softened, see-through and shrunk, browned as far as `browning` says. */
  cooked?: boolean;
  /** Colour of soft cooked flesh before any browning. */
  cookedColor?: string;
  /** 0 is soft and see-through (sweated), 0.5 golden (sautéed), 1 deep brown (caramelized). */
  browning?: number;
  seed?: number;
}

const DIMS: Record<BulbShape, { rx: number; ry: number; neck: number }> = {
  round: { rx: 34, ry: 31, neck: 10 },
  squat: { rx: 37, ry: 27, neck: 8 },
  long: { rx: 22, ry: 34, neck: 12 },
};

export interface BulbGeometry {
  /** Outline control points, drawn as a closed Catmull-Rom curve. */
  pts: Pt[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Tip of the neck and the middle of the root end. */
  tip: Pt;
  root: Pt;
  /** Lean of the whole bulb, in degrees. */
  lean: number;
  /** Lines from neck to root following the bulb's curve, as on the skin. */
  veins: Pt[][];
}

/** Rotates a point round (cx, cy) by `deg`. */
function turn([x, y]: Pt, cx: number, cy: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [x - cx, y - cy];
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** The bulb sitting on the counter: a rounded body that pinches up to a pointed neck, with a flat root end. */
export function bulbGeometry(shape: BulbShape, seed: number, trimmed = false): BulbGeometry {
  const rand = rng(seed * 13 + 3);
  const { rx, ry } = DIMS[shape];
  const neck = DIMS[shape].neck * (trimmed ? 0.35 : 1);
  const cx = 50;
  const cy = 52 + neck / 2;
  const lean = (rand() * 2 - 1) * 6;
  const n = 32;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const phi = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const up = Math.max(0, -Math.sin(phi));
    const down = Math.max(0, Math.sin(phi));
    const pinch = up ** (shape === "long" ? 5 : 11);
    const wob = 1 + (rand() * 2 - 1) * 0.012;
    const x = rx * Math.cos(phi) * (1 - 0.55 * pinch ** 0.4) * wob;
    const y = ry * Math.sin(phi) * (1 - 0.1 * down ** 4) * wob - neck * pinch;
    pts.push(turn([cx + x, cy + y], cx, cy, lean));
  }
  const tip = turn([cx, cy - ry - neck], cx, cy, lean);
  const root = turn([cx, cy + ry * 0.92], cx, cy, lean);
  const veins = [-62, -38, -14, 12, 36, 60].map((deg) => {
    const s = Math.sin((deg * Math.PI) / 180) * (0.92 + rand() * 0.08);
    const line: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const phi = -Math.PI / 2 + 0.22 + (k / 8) * (Math.PI - 0.5);
      line.push(turn([cx + rx * Math.cos(phi) * s, cy + ry * Math.sin(phi)], cx, cy, lean));
    }
    return [tip, ...line];
  });
  return { pts, cx, cy, rx, ry, tip, root, lean, veins };
}
