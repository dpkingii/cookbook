import { mix } from "../core/color";
import type { StrandShape } from "./strand-shape";

const CHAR = "#5a2e12";

export interface StrandPalette {
  body: string;
  char: string;
  browning: number;
}

/**
 * Dry pasta is a deep wheat gold and rice noodles an opaque white; cooked, wheat softens paler and glossier and rice
 * noodles turn translucent. `cookedColor` stands for a sauce they have soaked up.
 */
export function strandPalette(shape: StrandShape, color: string, cooked: boolean, cookedColor: string | undefined, browning: number): StrandPalette {
  const b = cooked ? Math.min(1, Math.max(0, browning)) : 0;
  const body = cooked ? (cookedColor ?? mix(color, shape === "flat" ? "#f6f2ea" : "#f7e4a8", shape === "flat" ? 0.5 : 0.4)) : color;
  return { body, char: mix(body, CHAR, 0.55 + b * 0.35), browning: b };
}
