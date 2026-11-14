import type { Ingredient, TokenShape } from "@/lib/recipe/types";
import type { Item } from "./contents";
import { clamp01, HEX, INK, mix } from "./palette";
import { blob, rng, seedOf, smooth, type Pt } from "./rough";
import { TokenArt } from "./tokens";

/** What heat does to each kind of ingredient, as a colour. */
export function cookedColor(ing: Ingredient, cooked: number): string {
  const c = ing.token.color;
  const d = clamp01(cooked);
  switch (ing.token.shape) {
    case "bulb":
      return mix(mix(c, HEX.paper, 0.55), "#d9962a", d);
    case "wedge":
      return mix(mix(c, HEX.paper, 0.3), "#e2bf6a", d * 0.75);
    case "round":
      return mix(c, HEX.tomatoDeep, d * 0.75);
    case "strand":
      return mix(c, "#f0d79a", d * 0.5);
    case "leaf":
      return mix(c, HEX.ink, d * 0.3);
    default:
      return mix(c, HEX.ink, d * 0.25);
  }
}

/** Sauce-like ingredients pool instead of sitting as pieces. */
export const isPool = (shape: TokenShape) => shape === "liquid" || shape === "round";

const PIECE_SIZE: Record<TokenShape, number> = {
  round: 9,
  bulb: 9,
  wedge: 5.5,
  cube: 7,
  long: 7,
  leaf: 11,
  strand: 10,
  grain: 2.6,
  liquid: 5,
};

/** One piece of a cut ingredient, centred on (0, 0). */
export function PiecePath({
  shape,
  color,
  seed,
  size = 1,
  line = 1.8,
}: {
  shape: TokenShape;
  color: string;
  seed: number;
  size?: number;
  line?: number;
}) {
  const r = PIECE_SIZE[shape] * size;
  if (shape === "leaf") {
    const d = `M${-r} ${r * 0.3}C${-r * 0.6} ${-r * 0.7} ${r * 0.5} ${-r * 0.9} ${r} ${-r * 0.4}C${r * 0.5} ${r * 0.6} ${-r * 0.4} ${r * 0.8} ${-r} ${r * 0.3}Z`;
    return (
      <g transform={`rotate(${(seed % 360) - 180})`}>
        <path d={d} fill={color} transform="translate(1 0.8)" />
        <path d={d} fill="none" stroke={INK.ink} strokeWidth={line} strokeLinejoin="round" />
        <path d={`M${-r * 0.9} ${r * 0.3}Q0 ${-r * 0.1} ${r * 0.85} ${-r * 0.35}`} fill="none" stroke={INK.ink} strokeWidth={line * 0.6} />
      </g>
    );
  }
  if (shape === "grain") {
    return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={0.6} fill={color} stroke={INK.ink} strokeWidth={line * 0.6} transform={`rotate(${seed % 90})`} />;
  }
  if (shape === "strand") {
    const d = `M${-r} 0Q0 ${seed % 2 ? -r : r} ${r} 0`;
    return (
      <g>
        <path d={d} fill="none" stroke={INK.ink} strokeWidth={line * 2.4} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={line * 1.1} strokeLinecap="round" />
      </g>
    );
  }
  const d =
    shape === "cube"
      ? blob(0, 0, r, r * 0.9, seed, 0.12, 4, Math.PI / 4)
      : shape === "long"
        ? blob(0, 0, r, r * 0.7, seed, 0.06, 7)
        : blob(0, 0, r, r * 0.8, seed, 0.3, 5, (seed % 7) / 2);
  return (
    <g>
      <path d={d} fill={color} transform="translate(1.1 0.9)" />
      <path d={d} fill="none" stroke={INK.ink} strokeWidth={line} strokeLinejoin="round" />
      {shape === "long" && <ellipse rx={r * 0.4} ry={r * 0.28} fill="none" stroke={INK.ink} strokeWidth={line * 0.5} />}
    </g>
  );
}

export interface Placed {
  x: number;
  y: number;
  seed: number;
}

/** Fixed, per-ingredient positions inside an ellipse, so pieces don't jump between steps. */
export function placements(id: string, n: number, cx: number, cy: number, rx: number, ry: number): Placed[] {
  const seed = seedOf(id);
  const rand = rng(seed);
  const out: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand());
    out.push({
      x: Math.round((cx + Math.cos(a) * rx * rad) * 10) / 10,
      y: Math.round((cy + Math.sin(a) * ry * rad) * 10) / 10,
      seed: (seed + i * 7919) >>> 0,
    });
  }
  return out.sort((p, q) => p.y - q.y);
}

const COUNT: Record<TokenShape, number> = {
  round: 7,
  bulb: 13,
  wedge: 12,
  cube: 8,
  long: 9,
  leaf: 4,
  strand: 0,
  grain: 14,
  liquid: 0,
};

/** Pieces of one ingredient strewn in a vessel. Uncut things show as small whole tokens. */
export function Scattered({
  item,
  cx,
  cy,
  rx,
  ry,
  color,
  keep = 1,
  size = 1,
}: {
  item: Item;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  keep?: number;
  size?: number;
}) {
  const shape = item.ingredient.token.shape;
  const whole = !item.cut && shape !== "leaf" && shape !== "grain";
  const n = Math.round((whole ? 4 : COUNT[shape]) * keep);
  const spots = placements(item.ingredient.id, n, cx, cy, rx, ry);
  return (
    <g>
      {spots.map((p) => (
        <g key={p.seed} transform={`translate(${p.x} ${p.y})`}>
          {whole ? (
            <g transform={`scale(${0.5 * size}) translate(-24 -24)`}>
              <TokenArt shape={shape} color={color} stroke={3.4} />
            </g>
          ) : (
            <PiecePath shape={shape} color={color} seed={p.seed} size={size} />
          )}
        </g>
      ))}
    </g>
  );
}

/** A tangle of long strands lying in an ellipse, like pasta in a pan or colander. */
export function Tangle({
  id,
  cx,
  cy,
  rx,
  ry,
  color,
  n = 9,
  line = 3.2,
}: {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  n?: number;
  line?: number;
}) {
  const rand = rng(seedOf(id + "tangle"));
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const pts: Pt[] = [];
    const a0 = rand() * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const a = a0 + k * (1.1 + rand() * 0.6);
      const rad = 0.35 + rand() * 0.6;
      pts.push([cx + Math.cos(a) * rx * rad, cy + Math.sin(a) * ry * rad]);
    }
    paths.push(smooth(pts, false));
  }
  return (
    <g>
      {paths.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={INK.ink} strokeWidth={line * 2} strokeLinecap="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={line} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

/** Mix of the pool-forming ingredients' colours, plus how much of the vessel they fill. */
export function poolOf(items: Item[]): { color: string; body: number; done: number; sauce: Item | null } | null {
  const pools = items.filter((it) => isPool(it.ingredient.token.shape));
  if (pools.length === 0) return null;
  const sauce = pools.find((p) => p.ingredient.token.shape === "round") ?? null;
  if (sauce) {
    const done = clamp01(sauce.cooked);
    return { color: cookedColor(sauce.ingredient, done), body: 1 - done * 0.15, done, sauce };
  }
  const oil = pools[0];
  return { color: oil.ingredient.token.color, body: 0.55, done: 0, sauce: null };
}
