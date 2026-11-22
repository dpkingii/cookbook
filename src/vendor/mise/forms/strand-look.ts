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
  /** Bean sprouts are in the wok for seconds: they catch only a little. */
  const b = cooked ? Math.min(1, Math.max(0, browning)) * (shape === "sprout" ? 0.35 : 1) : 0;
  /** A cooked bean sprout goes translucent and a little grey-green. */
  const done = shape === "flat" ? "#f6f2ea" : shape === "sprout" ? "#e4e6c8" : "#f7e4a8";
  const body = cooked ? (cookedColor ?? mix(color, done, shape === "flat" || shape === "sprout" ? 0.5 : 0.4)) : color;
  return { body, char: mix(body, CHAR, 0.55 + b * 0.35), browning: b };
}
