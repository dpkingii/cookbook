import { mix } from "../core/color";
import { FLESH, GILL, type CapShape } from "./cap-shape";

const CRUST = "#6a3a14";

export interface CapPalette {
  cap: string;
  flesh: string;
  gill: string;
  crust: string;
  browning: number;
}

/** Cooked mushrooms darken and turn a glossy brown, their pale flesh going tan. */
export function capPalette(shape: CapShape, color: string, flesh: string | undefined, cooked: boolean, cookedColor: string | undefined, browning: number): CapPalette {
  const f = flesh ?? FLESH[shape];
  return {
    cap: cooked ? (cookedColor ?? mix(color, "#6a4226", 0.35)) : color,
    flesh: cooked ? mix(f, "#c8a27a", 0.45) : f,
    gill: cooked ? mix(GILL[shape], "#5a3a22", 0.35) : GILL[shape],
    crust: CRUST,
    browning: cooked ? Math.min(1, Math.max(0, browning)) : 0,
  };
}
