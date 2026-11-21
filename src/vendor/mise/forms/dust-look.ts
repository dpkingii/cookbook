import { lighten, luma, mix } from "../core/color";
import { type DustShape } from "./dust-shape";

export const GOLD = "#e3c77e";
export const CARAMEL = "#b8711f";
export const CRUST = "#6e3a0e";
export const CHAR = "#2a1d12";
/** Sugar's caramel, from just melted to dark. */
export const AMBER = "#d0861f";
export const DARK_CARAMEL = "#7a3a0c";
export const SMOKE = "#cfc9c0";

export const clamp = (n: number) => Math.min(1, Math.max(0, n));

export interface DustLook {
  browning: number;
  burn: number;
  /** How far sugar has melted, 0 to 1. Nothing else melts. */
  melt: number;
  toast: (c: string) => string;
  caramel: string;
}

export function dustLook(shape: DustShape, cookedColor: string | undefined, browning: number): DustLook {
  const b = clamp(browning);
  const burn = Math.max(0, b - 0.85) / 0.15;
  const deep = mix(CARAMEL, CRUST, Math.max(0, (b - 0.4) / 0.6));
  /** Dark spices toast toward a deeper brown than pale flour does, so they never come out lighter than raw. */
  const toward = (c: string) => mix(mix(deep, CRUST, 1 - luma(c)), CHAR, (1 - luma(c)) * 0.4);
  return {
    browning: b,
    burn,
    melt: shape === "sugar" ? clamp((b - 0.2) / 0.45) : 0,
    /** Salt barely changes. Everything else goes golden, then brown, then burnt; pale flour shows it most. */
    toast: (c) =>
      shape === "crystal"
        ? mix(c, GOLD, b * 0.12)
        : mix(mix(mix(c, cookedColor ?? GOLD, (0.2 + 0.3 * b) * luma(c) ** 2), toward(c), b * 0.55), CHAR, burn * 0.45),
    caramel: mix(mix(lighten(AMBER, 0.3), AMBER, clamp((b - 0.2) / 0.25)), DARK_CARAMEL, clamp((b - 0.5) / 0.4)),
  };
}
