function parse(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const k = Math.min(1, Math.max(0, t));
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

/** Lightness from 0 (black) to 1 (white). */
export function luma(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const INK = "#111111";
/** Shading heads toward a warm brown, so pale food keeps its warmth instead of going grey. */
export const SHADE = "#5b3a2c";
export const WHITE = "#ffffff";

export const lighten = (c: string, t: number) => mix(c, WHITE, t);
export const darken = (c: string, t: number) => mix(c, INK, t);

/** WCAG relative luminance, 0 for black to 1 for white. */
function luminance(hex: string): number {
  const ch = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = parse(hex);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Non-text contrast that WCAG 1.4.11 asks of the parts of a graphic needed to understand it. */
export const GRAPHIC_CONTRAST = 3;

/**
 * The edge round a piece of food: at least `k` of the way to the shade, and further if that is what it takes to stand
 * 3:1 off a white counter, so salt, cream or a white onion never melts into a pale page for someone with low vision.
 */
export function outline(c: string, k: number): string {
  for (let t = k; t < 1; t += 0.02) {
    const e = mix(c, SHADE, t);
    if (contrast(e, WHITE) >= GRAPHIC_CONTRAST) return e;
  }
  return SHADE;
}

/** An feColorMatrix that turns noise into one colour whose alpha follows the noise, so texture can be laid over food. */
export function tint(hex: string, gain: number, offset: number): string {
  const [r, g, b] = parse(hex).map((v) => (v / 255).toFixed(3));
  return `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${gain} 0 0 0 ${offset}`;
}
