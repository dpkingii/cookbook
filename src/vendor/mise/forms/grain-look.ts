import { luma, mix, SHADE } from "../core/color";
import { type GrainShape } from "./grain-shape";

export const GOLD = "#e3c77e";
export const CARAMEL = "#b8711f";
export const CRUST = "#6e3a0e";
export const CHAR = "#2a1d12";
/** Cooked rice turns opaque, nearly white. */
export const STEAMED = "#fbfaf3";
/** Cooked corn brightens toward a juicy yellow. */
export const JUICY = "#ffd43a";

export const clamp = (n: number) => Math.min(1, Math.max(0, n));

export interface GrainLook {
  browning: number;
  burn: number;
  /** The grain's colour once cooked, browned as far as `browning` says. */
  cook: (c: string) => string;
  /** Colour of a browned spot. */
  spot: string;
}

export function grainLook(shape: GrainShape, cookedColor: string | undefined, browning: number): GrainLook {
  const b = clamp(browning);
  const burn = Math.max(0, b - 0.85) / 0.15;
  const done = (c: string) =>
    cookedColor ?? (shape === "rice" ? mix(c, STEAMED, 0.6) : shape === "lentil" ? mix(c, SHADE, 0.15) : shape === "kernel" ? mix(c, JUICY, 0.3) : c);
  /** Corn and lentils brown in spots more than all over; rice and sesame toast through. */
  const through = shape === "rice" || shape === "seed" ? 1 : 0.4;
  return {
    browning: b,
    burn,
    cook: (c) => {
      const d = done(c);
      /** Yellow mixed toward brown goes olive, so corn keeps its colour and chars only in its spots. */
      if (shape === "kernel") return mix(d, CARAMEL, b * 0.18);
      const toasted = mix(mix(d, GOLD, b * 0.45 * through * luma(d)), mix(CARAMEL, CRUST, clamp((b - 0.45) / 0.55)), clamp(b - 0.3) * 0.7 * through);
      return mix(toasted, CHAR, burn * 0.35);
    },
    spot:
      shape === "kernel"
        ? mix(mix(CARAMEL, CRUST, b), CHAR, clamp((b - 0.4) / 0.6) * 0.75)
        : mix(mix(CARAMEL, CRUST, clamp((b - 0.3) / 0.6)), CHAR, burn * 0.6),
  };
}
