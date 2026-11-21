import { mix, SHADE } from "../core/color";

const STRIPE = "#ee6a3c";
const CRUST = "#9c3d12";
const CHAR = "#2e1c10";

export interface CurlPalette {
  /** The shell, or the flesh once peeled: grey and see-through raw, opaque white cooked. */
  body: string;
  /** The back of each segment: darker grey raw, orange-red cooked. */
  stripe: string;
  tail: string;
  /** Cut flesh, and chopped or minced shrimp. */
  flesh: string;
  vein: string;
  crust: string;
  browning: number;
}

export function curlPalette(color: string, peeled: boolean, cooked: boolean, cookedColor: string | undefined, browning: number): CurlPalette {
  const b = cooked ? Math.min(1, Math.max(0, browning)) : 0;
  const burn = Math.max(0, b - 0.8) / 0.2;
  const stripe = cookedColor ?? STRIPE;
  if (cooked)
    return {
      body: peeled ? "#fbe8dc" : mix(stripe, "#fbd9c4", 0.35),
      stripe,
      tail: mix(stripe, "#d8401c", 0.3),
      flesh: "#fdf0e8",
      vein: mix(stripe, SHADE, 0.2),
      crust: mix(CRUST, CHAR, burn * 0.7),
      browning: b,
    };
  /** Raw flesh is a translucent grey with a faint pink; the shell a darker grey-blue. */
  const flesh = "#d8cfcc";
  return {
    body: peeled ? flesh : color,
    stripe: peeled ? mix(flesh, "#9a8f94", 0.45) : mix(color, "#4a5560", 0.35),
    tail: mix(color, "#3e4a58", 0.35),
    flesh,
    vein: "#4a3a36",
    crust: CRUST,
    browning: 0,
  };
}
