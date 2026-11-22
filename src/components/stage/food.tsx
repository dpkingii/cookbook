import type { Ingredient, TokenShape } from "@/lib/recipe/types";
import type { Item } from "./contents";
import { clamp01, HEX, mix } from "./palette";
import { blob, rng, seedOf, smooth, type Pt } from "./rough";
import { TokenArt } from "./tokens";
import { memo, useMemo } from "react";
import type { Cut } from "@/vendor/mise";
import { useStage } from "./context";
import { cutFor, miseFor, MiseArt, miseSize, type MiseMatch } from "./mise";
import { measure } from "@/vendor/mise";

/** Vessel scale: a 28 cm pan or pot fills about 230 stage units, so pieces cook at their true size. */
export const VESSEL_PX_PER_CM = 8;

/** One mise piece, drawn once into <defs> and reused at every spot. Memoised: geometry is costly and the stage re-renders as timers tick. */
const MiseDef = memo(function MiseDef({ id, match, cut, cooked, browning, px }: { id: string; match: MiseMatch; cut: Cut; cooked: boolean; browning: number; px: number }) {
  /** mise draws a slice of meat standing tall in its box; in a pan it lies along the pan, so tall pieces are laid down. */
  const lie = useMemo(() => {
    const pts = measure(match.form, { ...match.props, cut, layout: "piece" } as never).outlines.flat();
    const span = (k: 0 | 1) => Math.max(...pts.map((q) => q[k])) - Math.min(...pts.map((q) => q[k]));
    return span(1) > span(0) * 1.4;
  }, [match, cut]);
  return (
    <g id={id}>
      <g transform={lie ? "rotate(-78) scale(1 0.85)" : undefined}>
        <MiseArt match={match} cut={cut} x={0} y={0} pxPerCm={px} layout="piece" cooked={cooked} browning={browning} />
      </g>
    </g>
  );
});

/**
 * The cut a mise ingredient is in once it reaches a vessel: the one its board step asked for. Herbs and spinach added
 * straight to a dish go in as picked leaves ("torn basil"), not whole sprigs.
 */
export function miseCut(item: Item, match: MiseMatch, override?: Cut): { cut: Cut; picked: boolean } {
  if (override) return { cut: override, picked: true };
  /** Beaten egg in a pan sets into scrambled curds unless a vessel asks otherwise. */
  if (match.form === "egg") return { cut: "diced", picked: true };
  const picked = !item.cutIn && match.form === "leaf" && !["bokchoy", "cabbage"].includes((match.props as { shape?: string }).shape ?? "");
  const cut: Cut = item.cutIn ? cutFor(item.ingredient, item.cutIn.technique, item.cutIn.text, match) : picked ? "halved" : "whole";
  return { cut, picked };
}

/** Mise pieces strewn at the given spots: two seeds, mirrored and turned a little, so no two neighbours match. */
function MiseScatter({ item, match, at, keep, size, brown, cut: asked }: { item: Item; match: MiseMatch; at: [number, number, number, number]; keep: number; size: number; brown: boolean; cut?: Cut }) {
  const { uid } = useStage();
  const ing = item.ingredient;
  const { cut, picked } = miseCut(item, match, asked);
  const [cx, cy, rx, ry] = at;
  const n = useMemo(() => miseCount(item.cutIn != null || picked, match, cut, keep), [item.cutIn, picked, match, cut, keep]);
  const spots = useMemo(() => placements(ing.id, n, cx, cy, rx, ry), [ing.id, n, cx, cy, rx, ry]);
  const cooked = item.cooked > 0.25;
  /** Browning builds with time on the heat, in steps of 0.1 so the drawing only changes when the look does. */
  const browning = brown ? Math.round(Math.min(0.75, Math.max(0, item.cooked - 0.25) * 0.45) * 10) / 10 : 0;
  const px = VESSEL_PX_PER_CM * Math.min(1.3, Math.max(0.8, size));
  const variants = useMemo(() => [1, 2].map((seed) => ({ ...match, props: { ...match.props, seed: ((match.props as { seed?: number }).seed ?? 0) + seed } })), [match]);
  const base = `${uid}-m-${ing.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <g>
      <defs>
        {variants.map((v, i) => (
          <MiseDef key={i} id={`${base}-${i}`} match={v} cut={cut} cooked={cooked} browning={browning} px={px} />
        ))}
      </defs>
      {spots.map((p, i) => (
        <use key={p.seed} href={`#${base}-${i % 2}`} transform={`translate(${p.x} ${p.y}) rotate(${(p.seed % 21) - 10}) scale(${p.seed % 2 ? -1 : 1} 1)`} />
      ))}
    </g>
  );
}

/** How many mise pieces to strew: small pieces come in greater numbers, as they do in a real pan. */
function miseCount(isCut: boolean, match: MiseMatch, cut: Cut, keep: number): number {
  if (!isCut) return Math.max(1, Math.round(3 * keep));
  const cm = miseSize(match, cut, 1, "piece");
  return Math.round(Math.min(22, Math.max(5, 30 / Math.max(1, cm))) * keep);
}

const REDUCED = "#a82c1f";

/** A stock, broth or water that egg is poured into: it sets in ribbons there, as in egg drop soup. */
export const isBroth = (ing: Ingredient) => ing.token.shape === "liquid" && /\b(water|stock|broth|soup)\b/i.test(ing.name);

/** Eggs share the "round" token with tomatoes, but heat sets them into yellow curds rather than reducing them to sauce. */
export const isEgg = (ing: Ingredient) => /\beggs?\b|\byolks?\b/i.test(ing.name) && !/eggplant/i.test(ing.name);

/** A grain measured by the cup or by weight is the body of the dish (rice, quinoa), not a seasoning. */
export const isStaple = (ing: Ingredient) =>
  ing.token.shape === "grain" &&
  (/\b(rice|quinoa|couscous|bulgur|oats|barley|farro|polenta|grits)\b/i.test(ing.name) || /\b(cups?|kg|lb|pounds?)\b/i.test(ing.unit ?? ""));

/** A staple seen as a mound once cooked: rice goes from translucent raw grains to fluffy white. */
export function stapleColor(ing: Ingredient, cooked: number, sauces: string[] = []): string {
  let c = mix(mix(ing.token.color, "#e9e4d4", 0.5), HEX.white, clamp01(cooked) * 0.6);
  // Soy fried into rice reads golden brown, not grey, so each sauce pulls toward a warmed version of itself.
  for (const sauce of sauces) c = mix(c, mix(sauce, "#d08a2e", 0.6), 0.32);
  return c;
}

/** Dark sauces poured over a staple after it arrived (soy over rice) stain it; oil and water don't. */
export function sauceTints(items: Item[], since: number): string[] {
  return items
    .filter((it) => it.ingredient.token.shape === "liquid" && it.since >= since && !/\b(oil|water|stock|broth)\b/i.test(it.ingredient.name))
    .map((it) => it.ingredient.token.color);
}

/** What heat does to each kind of ingredient, as a colour. */
export function cookedColor(ing: Ingredient, cooked: number): string {
  const c = ing.token.color;
  const d = clamp01(cooked);
  if (isEgg(ing)) return mix(mix(c, "#ffd84a", 0.35), "#f0c04a", d * 0.4);
  switch (ing.token.shape) {
    case "bulb":
      return mix(mix(c, HEX.white, 0.5), "#d9962a", d);
    case "wedge":
      return mix(mix(c, HEX.white, 0.28), "#e2bf6a", d * 0.75);
    case "round":
      return reduces(ing) ? mix(c, REDUCED, d * 0.75) : mix(c, HEX.ink, d * 0.2);
    case "strand":
      return mix(c, "#f0d79a", d * 0.5);
    case "leaf":
      return mix(c, HEX.ink, d * 0.3);
    default:
      return mix(c, HEX.ink, d * 0.25);
  }
}

/** "Round" covers peas, chickpeas, lemons and broccoli too, but only tomatoes cook down into a sauce. */
const reduces = (ing: Ingredient) => ing.token.shape === "round" && /\btomato|\bpassata\b/i.test(ing.name);

/** Does this ingredient pool into sauce? Liquids do, tomatoes reduce, and eggs set into a custard or a sheet. */
export const poolsUp = (ing: Ingredient) => ing.token.shape === "liquid" || reduces(ing) || (ing.token.shape === "round" && isEgg(ing));

/** Water and stock cooked with the food stop reading as water: they thicken into a clear glaze. */
const GLAZE = "#f1ecd8";
const clear = (ing: Ingredient) => /\b(water|stock|broth)\b/i.test(ing.name);

/**
 * Noodles mise can draw, heaped at true size where they lie: a dry bundle until a quarter of the way through a heated
 * step, then a soft tangle that soaks up the sauce it is tossed in and chars in patches with time in the wok. Null for
 * strands mise has no form for yet (bean sprouts), which keep the plain tangle.
 */
export const MiseNoodles = memo(function MiseNoodles({ ing, cx, cy, cooked, browning, sauce }: { ing: Ingredient; cx: number; cy: number; cooked: boolean; browning: number; sauce: string | null }) {
  const match = miseFor(ing);
  if (match?.form !== "strand") return null;
  const props = match.props as { color?: string };
  const plain = mix(props.color ?? ing.token.color, "#f7e4a8", 0.4);
  /** Soy turns noodles amber, not grey, so a sauce is warmed before it tints them. */
  const sauced = sauce ? { ...match, props: { ...match.props, cookedColor: mix(plain, mix(sauce, "#d08a2e", 0.5), 0.4) } } : match;
  /** Fresh or already-cooked noodles go in soft, never as a dry bundle. */
  const soft = cooked || /\b(fresh|cooked|boiled)\b/i.test(ing.name);
  return <MiseArt match={sauced} cut="whole" x={cx} y={cy} pxPerCm={VESSEL_PX_PER_CM} cooked={soft} browning={browning} />;
});

/** Grains of rice heaped in a dome, each grain a short rounded tick so it reads as rice and not a blob. */
export function Mound({
  id,
  cx,
  base,
  rx,
  height,
  color,
  flecks = [],
  neat = false,
}: {
  id: string;
  cx: number;
  /** y of the mound's foot. */
  base: number;
  rx: number;
  height: number;
  color: string;
  /** Other ingredients mixed through, drawn as small pieces on the surface. */
  flecks?: { shape: TokenShape; color: string; id: string }[];
  /** A moulded dome (packed in a bowl and turned out) instead of a loose heap. */
  neat?: boolean;
}) {
  const rand = rng(seedOf(id + "mound"));
  const pts: Pt[] = [];
  const N = 15;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = Math.PI * (1 - t);
    const wob = neat ? 0 : (rand() - 0.5) * 6;
    const lift = neat ? Math.sin(a) ** 0.8 : Math.sin(a) ** 1.3;
    pts.push([cx + Math.cos(a) * rx + (i === 0 || i === N ? 0 : wob * 0.5), base - lift * height + (i === 0 || i === N ? 0 : wob)]);
  }
  const top = smooth(pts, false);
  const d = `${top}Q${cx} ${base + height * 0.22} ${pts[0][0]} ${pts[0][1]}Z`;
  const inside = (x: number, y: number) => {
    const u = (x - cx) / rx;
    if (Math.abs(u) > 0.92) return false;
    const lift = neat ? Math.sqrt(1 - u * u) ** 0.8 : Math.sqrt(1 - u * u) ** 1.3;
    return y > base - lift * height + 5 && y < base + 2;
  };
  const ticks: { x: number; y: number; a: number }[] = [];
  for (let k = 0; ticks.length < 46 && k < 400; k++) {
    const x = cx + (rand() * 2 - 1) * rx;
    const y = base - rand() * height;
    if (inside(x, y)) ticks.push({ x, y, a: rand() * 180 });
  }
  const dark = mix(color, HEX.ink, 0.45);
  const spots: { x: number; y: number; seed: number }[] = [];
  for (let k = 0; spots.length < flecks.length * 4 && k < 600; k++) {
    const x = cx + (rand() * 2 - 1) * rx * 0.85;
    const y = base - rand() * height * 0.9;
    if (inside(x, y)) spots.push({ x, y, seed: (rand() * 1e6) | 0 });
  }
  return (
    <g>
      <path d={d} fill={color} stroke={HEX.ink} strokeWidth={2} strokeLinejoin="round" />
      {ticks.map((t, i) => (
        <path
          key={i}
          d={`M-2.4 0h4.8`}
          transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.a.toFixed(0)})`}
          stroke={dark}
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      ))}
      {spots.map((p, i) => {
        const f = flecks[i % flecks.length];
        return (
          <g key={`f${i}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <PiecePath shape={f.shape === "round" ? "cube" : f.shape} color={f.color} seed={p.seed} size={0.55} line={1.2} />
          </g>
        );
      })}
    </g>
  );
}

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
        <path d={d} fill={color} stroke={HEX.ink} strokeWidth={line} strokeLinejoin="round" />
        <path d={`M${-r * 0.9} ${r * 0.3}Q0 ${-r * 0.1} ${r * 0.85} ${-r * 0.35}`} fill="none" stroke={HEX.ink} strokeWidth={line * 0.6} />
      </g>
    );
  }
  if (shape === "grain") {
    return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={0.6} fill={color} stroke={HEX.ink} strokeWidth={line * 0.6} transform={`rotate(${seed % 90})`} />;
  }
  if (shape === "strand") {
    const d = `M${-r} 0Q0 ${seed % 2 ? -r : r} ${r} 0`;
    return (
      <g>
        <path d={d} fill="none" stroke={HEX.ink} strokeWidth={line * 2.4} strokeLinecap="round" />
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
      <path d={d} fill={color} stroke={HEX.ink} strokeWidth={line} strokeLinejoin="round" />
      {shape === "long" && <ellipse rx={r * 0.4} ry={r * 0.28} fill="none" stroke={HEX.ink} strokeWidth={line * 0.5} />}
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
  brown = true,
  cut,
}: {
  item: Item;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  keep?: number;
  size?: number;
  /** Heat browns mise pieces here; a pot of water or a microwave only softens them. */
  brown?: boolean;
  /** The cut to draw, when the vessel decides it: beaten egg is curds in a pan but ribbons in a soup. */
  cut?: Cut;
}) {
  const match = miseFor(item.ingredient);
  if (match) {
    return <MiseScatter item={item} match={match} at={[cx, cy, rx, ry]} keep={keep} size={size} brown={brown} cut={cut} />;
  }
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
          <path d={d} fill="none" stroke={HEX.ink} strokeWidth={line * 2} strokeLinecap="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={line} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

/** Mix of the pool-forming ingredients' colours, plus how much of the vessel they fill. */
export function poolOf(items: Item[]): { color: string; body: number; done: number; sauce: Item | null } | null {
  const pools = items.filter((it) => poolsUp(it.ingredient));
  if (pools.length === 0) return null;
  const sauce = pools.find((p) => p.ingredient.token.shape !== "liquid") ?? null;
  if (sauce) {
    const done = clamp01(sauce.cooked);
    return { color: cookedColor(sauce.ingredient, done), body: 1 - done * 0.15, done, sauce };
  }
  const tones = pools.map((p) => (clear(p.ingredient) ? mix(p.ingredient.token.color, GLAZE, clamp01(p.cooked * 2)) : p.ingredient.token.color));
  const color = tones.reduce((acc, c, i) => mix(acc, c, 1 / (i + 1)));
  return { color, body: 0.55, done: 0, sauce: null };
}
