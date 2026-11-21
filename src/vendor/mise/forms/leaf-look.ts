import { darken, lighten, mix, SHADE } from "../core/color";
import { RIB, type LeafShape } from "./leaf-shape";

/**
 * Heat darkens herbs and spinach to a deep, glossy green; bok choy leaves brighten while the stalks turn a translucent
 * jade; cabbage deepens and its pale ribs go glassy.
 */
const COOKED: Record<LeafShape, [string, number]> = {
  cilantro: ["#2f5a26", 0.35],
  basil: ["#2e5a24", 0.4],
  spinach: ["#1d461b", 0.5],
  bokchoy: ["#2f8c3a", 0.35],
  cabbage: ["", 0],
};
const COOKED_RIB: Record<LeafShape, [string, number]> = {
  cilantro: ["#5a7a32", 0.4],
  basil: ["#5a7a32", 0.4],
  spinach: ["#5f7d36", 0.4],
  bokchoy: ["#d2e6a0", 0.6],
  cabbage: ["#dfe49c", 0.45],
};
const CRUST = "#6e4214";
const CHAR = "#241a10";

export interface LeafLook {
  browning: number;
  leaf: string;
  rib: string;
  crust: string;
}

export function leafLook(shape: LeafShape, color: string, rib: string | undefined, cookedColor: string | undefined, browning: number): LeafLook {
  const b = Math.min(1, Math.max(0, browning));
  const burn = Math.max(0, b - 0.8) / 0.2;
  const [to, t] = COOKED[shape];
  const leaf = cookedColor ?? (shape === "cabbage" ? mix(color, darken(color, 0.35), 0.45) : mix(color, to, t));
  const [rto, rt] = COOKED_RIB[shape];
  return { browning: b, leaf, rib: mix(rib ?? RIB[shape], rto, rt), crust: mix(CRUST, CHAR, 0.25 + burn * 0.6) };
}

export interface LeafPalette {
  leaf: string;
  light: string;
  dark: string;
  rib: string;
  /** The pale inside of a cut head. */
  heart: string;
}

export function palette(shape: LeafShape, color: string, rib: string | undefined, heart: string | undefined, look: LeafLook | null): LeafPalette {
  const leaf = look ? look.leaf : color;
  const r = look ? look.rib : (rib ?? RIB[shape]);
  const h = heart ?? (shape === "cabbage" ? lighten(mix(r, color, 0.12), 0.35) : lighten(r, 0.25));
  return { leaf, light: lighten(leaf, 0.3), dark: mix(leaf, SHADE, 0.4), rib: r, heart: look ? mix(h, r, 0.4) : h };
}
