import { lighten, mix, SHADE } from "../core/color";

const CHAR = "#22160f";

export interface PepperPalette {
  skin: string;
  /** The cut edge of the wall. */
  flesh: string;
  /** The inside of the wall, paler and matte. */
  inside: string;
  rib: string;
  crust: string;
  browning: number;
}

/** Cooked pepper deepens and loses some gloss; roasting blisters the skin black in patches. */
export function pepperPalette(color: string, cooked: boolean, cookedColor: string | undefined, browning: number): PepperPalette {
  const b = cooked ? Math.min(1, Math.max(0, browning)) : 0;
  const skin = cooked ? (cookedColor ?? mix(color, SHADE, 0.15)) : color;
  return {
    skin,
    flesh: mix(lighten(skin, 0.25), "#fff1dc", 0.3),
    inside: mix(lighten(skin, 0.45), "#fff6e6", 0.35),
    rib: "#f3ead2",
    crust: CHAR,
    browning: b,
  };
}
