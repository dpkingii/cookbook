import { lighten, mix } from "../core/color";
import { greenAt, type StalkShape } from "./stalk-shape";

/** Where greens head as they wilt, whites as they soften, everything as it browns, and as it chars. */
export const OLIVE = "#8a8a3a";
export const GOLD = "#e3c77e";
export const CARAMEL = "#b8711f";
export const CRUST = "#6e3a0e";
export const CHAR = "#2a1d12";

export interface Look {
  browning: number;
  cook: (c: string, green: number) => string;
  crust: string;
}

export function stalkLook(cookedColor: string | undefined, browning: number): Look {
  const b = Math.min(1, Math.max(0, browning));
  /** Past 0.85 the edges char black, as on scallions left too long on the grill. */
  const burn = Math.max(0, b - 0.85) / 0.15;
  return {
    browning: b,
    /** Just wilted, greens stay bright and only darken a touch; they go olive as the heat goes on. */
    cook: (c, green) => mix(mix(c, green > 0.5 ? (cookedColor ?? OLIVE) : GOLD, 0.12 + green * 0.12 + b * 0.25), CARAMEL, b * 0.35),
    crust: mix(CRUST, CHAR, burn * 0.7),
  };
}

/** Colours of a stalk from root to tip, raw or cooked: its skin, and its paler cut face. */
export function palette(shape: StalkShape, base: string, color: string, look: Look | null) {
  const raw = (t: number) => mix(base, color, greenAt(shape, t));
  const skin = (t: number) => (look ? look.cook(raw(t), greenAt(shape, t)) : raw(t));
  const section = (t: number) => lighten(mix(skin(t), look ? look.cook(base, 0) : base, 0.45), 0.22);
  return { skin, section, leaf: look ? look.cook(color, 1) : color };
}
