import { luma, mix } from "../core/color";
import { type PoolShape } from "./pool-shape";

export const CARAMEL = "#b8711f";
export const CRUST = "#6e3a0e";
export const CHAR = "#2a1d12";
/** Where a liquid heads as it reduces: deeper and browner, never grey. */
export const DEEP = "#2b1206";
export const AMBER = "#8a5212";
export const SMOKE = "#cfc9c0";
export const GLOW = "#ffe7a0";

export interface PoolLook {
  browning: number;
  /** How far it has cooked down, 0 to 1. Oil doesn't reduce. */
  reduce: number;
  /** Past 0.85, scorching at the edges. */
  burn: number;
  color: string;
  crust: string;
}

export function poolLook(shape: PoolShape, color: string, cookedColor: string | undefined, browning: number): PoolLook {
  const b = Math.min(1, Math.max(0, browning));
  const burn = Math.max(0, b - 0.85) / 0.15;
  const c = cookedColor ?? color;
  const oil = shape === "oil";
  return {
    browning: b,
    reduce: oil ? 0 : b,
    burn,
    /** Pale liquids catch toward caramel as they reduce, as cream and stock do; dark ones just deepen. */
    color: oil
      ? mix(mix(c, AMBER, 0.1 + b * 0.35), DEEP, burn * 0.3)
      : mix(mix(c, CARAMEL, (0.06 + b * 0.3) * luma(c)), DEEP, (0.08 + b * 0.36) * (1 - luma(c) * 0.8) + burn * 0.15),
    crust: mix(CRUST, CHAR, burn * 0.7),
  };
}
