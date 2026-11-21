import { mix, SHADE, WHITE } from "../core/color";
import { COLLAPSE } from "./round-cuts";
import type { RoundShape } from "./round-shape";

export const CARAMEL = "#a8601c";
export const CHAR = "#2a1d12";
export const clamp = (n: number) => Math.min(1, Math.max(0, n));

export interface RoundLook {
  skin: string;
  flesh: string;
  /** Colour of browned patches, edges and grill marks. */
  crust: string;
  browning: number;
  burn: number;
  /** How far the fruit slumps as it softens: tomatoes most, citrus not at all. */
  collapse: number;
}

/** Tomatoes roast deep red and jammy, citrus warms and caramelizes on the grill, apples bake golden and translucent. */
export function roundLook(shape: RoundShape, color: string, flesh: string, cookedColor: string | undefined, browning: number): RoundLook {
  const b = clamp(browning);
  const burn = Math.max(0, b - 0.85) / 0.15;
  const soft =
    cookedColor ?? (shape === "tomato" ? mix(flesh, "#c22d18", 0.3) : shape === "apple" ? mix(flesh, "#ecc46c", 0.55) : mix(flesh, "#f0a23a", 0.2));
  const skin = shape === "tomato" ? mix(color, "#8e1408", 0.25 + b * 0.2) : shape === "apple" ? mix(color, SHADE, 0.12 + b * 0.22) : mix(color, CARAMEL, b * 0.3);
  return {
    skin: mix(skin, CHAR, burn * 0.4),
    flesh: mix(mix(soft, CARAMEL, b * (shape === "apple" ? 0.3 : 0.2)), CHAR, burn * 0.25),
    crust: mix(mix(CARAMEL, "#5a2a0c", b), CHAR, burn * 0.7),
    browning: b,
    burn,
    collapse: COLLAPSE[shape],
  };
}

/** Flesh each fruit has when no `flesh` is given. */
export function fleshOf(shape: RoundShape, color: string): string {
  if (shape === "apple") return "#f6ecc8";
  if (shape === "lemon") return mix(color, "#fff6b8", 0.45);
  if (shape === "citrus") return mix(color, WHITE, 0.18);
  return mix(color, "#ff7a5a", 0.25);
}
