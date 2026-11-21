import { lighten, mix } from "../core/color";
import { WHITE_EGG, YOLK, type EggState } from "./egg-shape";

const CRUST = "#b06a24";
const CHAR = "#3a2412";

export interface EggPalette {
  /** The set white, or a boiled egg's white (stained by a braise when cooked with `cookedColor`). */
  white: string;
  /** A yolk as it shows: glossy and deep raw or soft, pale and crumbly hard-boiled. */
  yolk: string;
  /** Beaten egg, and the curds, omelette and bits it sets into. */
  beaten: string;
  /** Set beaten egg as curds, ribbons and bits: pale and soft just set, warming to gold as it fries. */
  curd: string;
  crust: string;
  browning: number;
}

export function eggPalette(state: EggState, yolk: string | undefined, soft: boolean, cooked: boolean, cookedColor: string | undefined, browning: number): EggPalette {
  const y = yolk ?? YOLK;
  const b = cooked ? Math.min(1, Math.max(0, browning)) : 0;
  const burn = Math.max(0, b - 0.8) / 0.2;
  const boiled = state === "boiled" || state === "shell";
  return {
    white: boiled && cooked && cookedColor ? mix(WHITE_EGG, cookedColor, 0.75) : WHITE_EGG,
    yolk: boiled ? (soft ? mix(y, "#ef8a14", 0.3) : mix(y, "#fbe39a", 0.45)) : y,
    /** Beaten egg is a strong yellow raw and sets paler, fluffier and a little golden. */
    beaten: cooked ? (cookedColor ?? mix(lighten(y, 0.35), "#f7dc7a", 0.4)) : mix(y, "#f6c63a", 0.25),
    curd: cooked ? mix(cookedColor ?? mix(lighten(y, 0.35), "#f7dc7a", 0.4), "#e0a032", b * 0.45) : mix(lighten(y, 0.3), "#f8de80", 0.5),
    crust: mix(CRUST, CHAR, burn * 0.7),
    browning: b,
  };
}
