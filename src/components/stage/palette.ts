export const HEX = {
  paper: "#f4ecdc",
  paperDeep: "#e9dec7",
  ink: "#1f2430",
  inkSoft: "#5b6072",
  tomato: "#d8412f",
  tomatoDeep: "#a82c1f",
  gold: "#e0a93b",
} as const;

export const INK = {
  paper: `var(--paper, ${HEX.paper})`,
  paperDeep: `var(--paper-deep, ${HEX.paperDeep})`,
  ink: `var(--ink, ${HEX.ink})`,
  inkSoft: `var(--ink-soft, ${HEX.inkSoft})`,
  tomato: `var(--tomato, ${HEX.tomato})`,
  tomatoDeep: `var(--tomato-deep, ${HEX.tomatoDeep})`,
  gold: `var(--gold, ${HEX.gold})`,
} as const;

/** How far the colour plate is knocked off its key line, in viewBox units. */
export const MIS = { x: 1.8, y: 1.3 } as const;

export const WATER = "#d9d6cc";

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
