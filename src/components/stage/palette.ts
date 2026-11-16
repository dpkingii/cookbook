/** The stage's own colours: black line on white. Colour comes only from the food. */
export const HEX = {
  white: "#ffffff",
  ink: "#111111",
  grey: "#6a6a6a",
  light: "#f6f6f4",
  rule: "#e2e2e2",
} as const;

/** Stroke weights in the 400×300 viewBox: vessel and tool outlines, then the detail inside them. */
export const LINE = { main: 2.5, detail: 1.6 } as const;

/** Light grey, one step darker than `light`, so water still reads on a pale vessel floor. */
export const WATER = HEX.rule;

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function parse(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const k = clamp01(t);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
