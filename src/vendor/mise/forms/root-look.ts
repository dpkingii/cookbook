import { lighten, mix } from "../core/color";
import { FLESH, SHOULDER, type RootShape } from "./root-shape";

/** Where each root's flesh heads as it cooks: carrot deepens and glosses, potato turns golden, daikon goes translucent. */
const COOKED: Record<RootShape, string> = { carrot: "#e8621c", daikon: "#eadfc3", potato: "#f2cd68" };
export const CARAMEL = "#c06a1c";
const CRUST = "#7a3a0c";
const CHAR = "#2e1a0c";

export interface RootLook {
  browning: number;
  /** Cooked flesh before browning. */
  flesh: string;
  crust: string;
}

export function rootLook(shape: RootShape, flesh: string, cookedColor: string | undefined, browning: number): RootLook {
  const b = Math.min(1, Math.max(0, browning));
  /** Past 0.85 the edges catch and blacken, as on roast potatoes left too long. */
  const burn = Math.max(0, b - 0.85) / 0.15;
  const cooked = cookedColor ?? mix(flesh, COOKED[shape], shape === "daikon" ? 0.55 : 0.4);
  return { browning: b, flesh: mix(cooked, CARAMEL, b * (shape === "potato" ? 0.45 : 0.3)), crust: mix(CRUST, CHAR, burn * 0.7) };
}

export interface RootPalette {
  skin: string;
  flesh: string;
  /** A carrot's paler inner core; on daikon and potato, the faint ring of vessels near the edge. */
  core: string;
  shoulder: string;
}

export function palette(shape: RootShape, color: string, flesh: string | undefined, core: string | undefined, shoulder: string | undefined, look: RootLook | null): RootPalette {
  const raw = flesh ?? (shape === "carrot" ? mix(FLESH.carrot, color, 0.35) : FLESH[shape]);
  const f = look ? look.flesh : raw;
  const c = core ?? (shape === "carrot" ? lighten(mix(raw, "#f9c55a", 0.62), 0.2) : mix(raw, shape === "potato" ? "#e2c77c" : "#dcd8c4", 0.5));
  /** Roasted, the skin darkens toward the crust; peeled away it is the flesh anyway. */
  const skin = look ? mix(color, CARAMEL, 0.15 + look.browning * 0.4) : color;
  return { skin, flesh: f, core: look ? mix(c, look.flesh, 0.5) : c, shoulder: shoulder ?? SHOULDER };
}
