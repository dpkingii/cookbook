import { lighten, mix, SHADE } from "../core/color";
import { LEAF, STEM, type FloretShape } from "./floret-shape";

/** Steamed broccoli turns a vivid green; cooked cauliflower creams. Roasting then browns the bud tips, and too far chars them. */
const COOKED: Record<FloretShape, string> = { broccoli: "#2bab3c", cauliflower: "#f1deaa" };
const CRUST = "#7a4612";
const CHAR = "#2a1b10";

export interface FloretLook {
  browning: number;
  buds: string;
  crust: string;
}

export function floretLook(shape: FloretShape, color: string, cookedColor: string | undefined, browning: number): FloretLook {
  const b = Math.min(1, Math.max(0, browning));
  const burn = Math.max(0, b - 0.8) / 0.2;
  return { browning: b, buds: cookedColor ?? mix(color, COOKED[shape], shape === "broccoli" ? 0.62 : 0.4), crust: mix(CRUST, CHAR, 0.3 + burn * 0.6) };
}

export interface FloretPalette {
  buds: string;
  budLight: string;
  budDark: string;
  stem: string;
  /** The pale flesh of a cut stalk or a cut head. */
  flesh: string;
  leaf: string;
}

export function palette(shape: FloretShape, color: string, stem: string | undefined, leaf: string | undefined, look: FloretLook | null): FloretPalette {
  const buds = look ? look.buds : color;
  const st = stem ?? STEM[shape];
  const cooked = (c: string) => (look ? mix(c, look.buds, 0.25) : c);
  return {
    buds,
    budLight: lighten(buds, shape === "broccoli" ? 0.28 : 0.45),
    budDark: mix(buds, SHADE, shape === "broccoli" ? 0.45 : 0.25),
    stem: cooked(st),
    flesh: cooked(lighten(st, shape === "broccoli" ? 0.45 : 0.55)),
    leaf: look ? mix(leaf ?? LEAF, "#7a7a30", 0.4) : (leaf ?? LEAF),
  };
}
