import { useId, type ReactNode } from "react";
import { Art, EDGE } from "../core/Art";
import { ImperfectDefs } from "../core/Imperfect";
import { lighten, mix, outline, tint, WHITE } from "../core/color";
import { bbox, centroid, polyPath, type Box } from "../core/geometry";
import { ring, rng, smooth, type Pt } from "../core/rough";
import { face, frameSlab, outlinePolygon, placed, SHADE, type Piece, type SlabProps } from "./slab-shape";

/** Where raw colours head when cooked without a colour of their own. */
const COOKED = "#b9824f";
/** The darkest browning a seared surface reaches. */
const CRUST = "#6e300c";

type Ids = (name: string) => string;

interface SkinProps {
  color: string;
  fat: string;
  rim: boolean;
  surface: NonNullable<SlabProps["surface"]>;
  tofu: boolean;
  top: Pt[];
  box: Box;
  seed: number;
  cooked: boolean;
  u: Ids;
}

/** The top of the whole slab: colour, grain, fat and shine. Every piece shows its own part of it. */
function Skin({ color, fat, rim, surface, tofu, top, box, seed, cooked, u }: SkinProps) {
  const rand = rng(seed + 11);
  const at = (x: number, y: number): Pt => [box.l + box.w * x, box.t + box.h * y];

  let detail: ReactNode = null;
  if (surface === "fatty") {
    detail = (
      <g filter={`url(#${u("soft")})`}>
        {[[0.14, 0.5, 0.5], [0.8, 0.26, -0.4], [0.62, 0.88, 0.2], [0.42, 0.18, 0.1]].map(([x, y, turn], i) => {
          const [cx, cy] = at(x!, y!);
          const pts = ring(cx, cy, 8 + rand() * 5, 3 + rand() * 2, seed + i, 0.35, 8).map(([px, py]): Pt => {
            const [dx, dy] = [px - cx, py - cy];
            return [cx + dx * Math.cos(turn!) - dy * Math.sin(turn!), cy + dx * Math.sin(turn!) + dy * Math.cos(turn!)];
          });
          return <path key={i} d={smooth(pts, true)} fill={fat} opacity={0.75} />;
        })}
      </g>
    );
  } else if (surface === "marbled") {
    detail = (
      <g fill="none" stroke={fat} strokeLinecap="round" filter={`url(#${u("fine")})`}>
        {Array.from({ length: 11 }, (_, i) => {
          const [x, y] = at(0.08 + rand() * 0.78, 0.12 + rand() * 0.76);
          const len = 6 + rand() * 16;
          const pts: Pt[] = [0, 1, 2, 3, 4].map((k) => [x + (k * len) / 4, y + (rand() * 2 - 1) * 2.6]);
          return <path key={i} d={smooth(pts, false)} strokeWidth={0.8 + rand() * 1.8} opacity={0.65 + rand() * 0.3} />;
        })}
      </g>
    );
  } else if (surface === "flaky") {
    detail = (
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => {
          const x = 0.14 + i * 0.11;
          const bend = (4 + rand() * 2) / box.w;
          const line = smooth([at(x + 0.02, 0.04), at(x - bend, 0.5), at(x + 0.02, 0.96)], false);
          return (
            <g key={i}>
              <path d={line} stroke={fat} strokeWidth={2.6} opacity={0.85} filter={`url(#${u("soft")})`} />
              <path
                d={line}
                transform="translate(2.2 0)"
                stroke={mix(color, SHADE, cooked ? 0.4 : 0.22)}
                strokeWidth={cooked ? 1.3 : 1}
                opacity={cooked ? 0.8 : 0.6}
                filter={`url(#${u("fine")})`}
              />
            </g>
          );
        })}
      </g>
    );
  }

  let rimBand: ReactNode = null;
  if (rim) {
    const n = top.length;
    const start = Math.round(n * 0.45);
    const edgePts = Array.from({ length: Math.ceil(n * 0.45) + 1 }, (_, i) => top[(start + i) % n]!);
    const [cx, cy] = centroid(top);
    const inner = edgePts.map(([x, y]): Pt => {
      const [dx, dy] = [cx - x, cy - y];
      const len = Math.hypot(dx, dy) || 1;
      return [x + (dx / len) * 8, y + (dy / len) * 8];
    });
    rimBand = (
      <g>
        <path
          d={`${smooth(edgePts, false)}L${smooth([...inner].reverse(), false).slice(1)}Z`}
          fill={fat}
          filter={`url(#${u("fine")})`}
        />
        <path d={smooth(inner, false)} fill="none" stroke={mix(fat, SHADE, 0.35)} strokeWidth={1.2} filter={`url(#${u("soft")})`} />
      </g>
    );
  }

  const pad = 14;
  const cover = { x: box.l - pad, y: box.t - pad, width: box.w + pad * 2, height: box.h + pad * 2 };
  return (
    <g id={u("skin")}>
      <rect {...cover} fill={`url(#${u("top")})`} />
      <rect
        {...cover}
        filter={`url(#${u("grain")})`}
        transform={tofu ? undefined : `rotate(${-12 + rand() * 24} ${box.cx} ${box.cy})`}
      />
      {rimBand}
      {detail}
      {!tofu && !cooked && <rect {...cover} filter={`url(#${u("sheen")})`} />}
      {cooked && <rect {...cover} filter={`url(#${u("sear")})`} />}
      <ellipse
        cx={box.l + box.w * 0.34}
        cy={box.t + box.h * 0.3}
        rx={box.w * 0.24}
        ry={box.h * 0.16}
        fill={`url(#${u("gloss")})`}
      />
      {(cooked || !tofu) && (
        <g fill={WHITE} filter={`url(#${u("fine")})`}>
          {Array.from({ length: cooked ? 3 : 4 }, (_, i) => {
            const [x, y] = at(0.18 + rand() * 0.6, 0.18 + rand() * 0.55);
            const s = cooked ? 0.6 : 1;
            return <ellipse key={i} cx={x} cy={y} rx={(1.6 + rand() * 2.2) * s} ry={(0.7 + rand() * 0.6) * s} opacity={0.55 + rand() * 0.3} />;
          })}
        </g>
      )}
    </g>
  );
}

/** The leftmost and rightmost points, where a piece's side drops straight down. */
function extremes(pts: Pt[]): [Pt, Pt] {
  let lo = pts[0]!;
  let hi = pts[0]!;
  for (const p of pts) {
    if (p[0] < lo[0]) lo = p;
    if (p[0] > hi[0]) hi = p;
  }
  return [lo, hi];
}

interface ChunkProps {
  piece: Piece;
  index: number;
  thick: number;
  color: string;
  /** Pile scale, so lines and blur stay the same width on screen whatever the zoom. */
  k: number;
  shadow: boolean;
  /** Cooked pieces brown at the edges and on their sides. */
  crust: string | null;
  u: Ids;
}

/** One piece standing on the counter: shadow, sides, its part of the skin, and the thin edge. */
function Chunk({ piece, index, thick, color, k, shadow, crust, u }: ChunkProps) {
  const pts = placed(piece);
  const c = centroid(piece.pts);
  const box = bbox(pts);
  const d = polyPath(pts);
  const edge = outline(color, 0.78);
  const [lo, hi] = extremes(pts);
  const layers = Math.max(1, Math.round(thick * k));
  const down = (dy: number) => polyPath(pts.map(([x, y]): Pt => [x, y + dy]));
  const side = u(`side${index}`);
  const clip = u(`clip${index}`);
  /** Seared meat is never a clean curve: dark crumbs of crust collect along the edge. */
  const crumbs = crust
    ? (() => {
        const rand = rng(index * 31 + 7);
        return Array.from({ length: Math.round(8 + (box.w + box.h) * 0.25) }, () => {
          const a = pts[Math.floor(rand() * pts.length)]!;
          const t = 0.04 + rand() * 0.1;
          return { at: [a[0] + (box.cx - a[0]) * t, a[1] + (box.cy - a[1]) * t] as Pt, r: (0.3 + rand() * 0.55) / Math.sqrt(k) };
        });
      })()
    : [];

  return (
    <g filter={crust ? `url(#${u("rough")})` : undefined}>
      <defs>
        <linearGradient id={side} gradientUnits="userSpaceOnUse" x1="0" y1={box.cy} x2="0" y2={box.b + thick}>
          <stop offset="0" stopColor={crust ? mix(color, crust, 0.35) : mix(color, SHADE, 0.22)} />
          <stop offset="1" stopColor={crust ? mix(color, crust, 0.65) : mix(color, SHADE, 0.5)} />
        </linearGradient>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      </defs>
      {shadow && (
        <path
          d={polyPath(pts.map(([x, y]): Pt => [x + 2, y + thick + 3.5]))}
          fill={SHADE}
          opacity={0.26}
          filter={`url(#${u("shadow")})`}
        />
      )}
      {Array.from({ length: layers }, (_, i) => thick * (1 - i / layers)).map((dy) => (
        <path key={dy} d={down(dy)} fill={`url(#${side})`} />
      ))}
      <path d={down(thick)} fill="none" stroke={edge} strokeWidth={EDGE / k} strokeLinejoin="round" />
      <path
        d={`M${lo[0]} ${lo[1]}v${thick}M${hi[0]} ${hi[1]}v${thick}`}
        stroke={edge}
        strokeWidth={EDGE / k}
        strokeLinecap="round"
      />
      <g clipPath={`url(#${clip})`}>
        <use
          href={`#${u("skin")}`}
          transform={`translate(${piece.dx} ${piece.dy}) rotate(${piece.rot} ${c[0]} ${c[1]})`}
        />
        <path
          d={d}
          fill="none"
          stroke={crust ?? mix(color, SHADE, 0.3)}
          strokeWidth={(crust ? 5 : 3) / k}
          opacity={crust ? 0.5 : 0.35}
          filter={`url(#${u("soft")})`}
        />
        {crumbs.map((c, i) => (
          <circle key={i} cx={c.at[0].toFixed(2)} cy={c.at[1].toFixed(2)} r={c.r.toFixed(2)} fill={mix(crust!, "#1e120a", 0.5)} opacity={0.75} />
        ))}
      </g>
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE / k} strokeLinejoin="round" />
    </g>
  );
}

/**
 * A flat piece of protein or tofu seen from above with its thickness showing: shaded, textured,
 * with soft fat, a wet shine on raw meat, a cast shadow and a thin edge in a dark shade of the food.
 * Cuts are made from the real outline, so each piece keeps its own part of the fat and grain.
 */
export function Slab({
  color,
  outline = "organic",
  surface = "plain",
  fat = lighten(color, 0.7),
  rim = false,
  cut = "whole",
  layout = "pile",
  cooked = false,
  cookedColor,
  sear = 0.6,
  seed = 1,
  ...art
}: SlabProps) {
  if (cooked) {
    color = cookedColor ?? mix(color, COOKED, 0.45);
    fat = mix(fat, "#e8bf7a", 0.45);
  }
  const crust = cooked ? mix(color, CRUST, 0.55) : null;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u: Ids = (name) => `${id}-${name}`;
  const top = face(outline, seed);
  const { result, pieces: shown, thick, fit, k } = frameSlab(outline, cut, seed, layout, cooked);
  const whole = bbox(outlinePolygon(outline, seed));
  const tofu = outline === "block";

  const order = shown.map((piece, index) => ({ piece, index })).sort((a, b) => bbox(placed(a.piece)).b - bbox(placed(b.piece)).b);
  const fibre = (tofu ? [0.55, 0.55] : surface === "flaky" ? [0.5, 0.04] : [0.035, 0.45]).map((f) => f * k).join(" ");

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={3 / k} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1.1 / k} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.4 / k} />
        </filter>
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={fibre} numOctaves={3} seed={seed} />
          <feColorMatrix type="matrix" values={tofu ? tint(crust ?? SHADE, 2.2, -1.2) : tint(mix(color, crust ?? SHADE, 0.6), 1.1, -0.45)} />
        </filter>
        <filter id={u("sheen")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.25 * k} numOctaves={2} seed={seed + 3} />
          <feColorMatrix type="matrix" values={tint(WHITE, 1.6, -1.05)} />
        </filter>
        {crust && <ImperfectDefs u={u} k={k} seed={seed} amount={0.6 + sear * 1} />}
        {crust && (
          <filter id={u("sear")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={0.07 * k} numOctaves={3} seed={seed + 9} />
            <feColorMatrix type="matrix" values={tint(crust, 1.2 + sear * 2.4, -0.55 - sear * 0.5)} />
          </filter>
        )}
        <radialGradient
          id={u("top")}
          gradientUnits="userSpaceOnUse"
          cx={whole.l + whole.w * 0.4}
          cy={whole.t + whole.h * 0.35}
          r={whole.w * 0.62}
        >
          <stop offset="0" stopColor={lighten(color, cooked ? 0.2 : 0.14)} />
          <stop offset="0.65" stopColor={color} />
          <stop offset="1" stopColor={mix(color, crust ?? SHADE, 0.16)} />
        </radialGradient>
        <radialGradient id={u("gloss")}>
          <stop offset="0" stopColor={WHITE} stopOpacity={tofu ? 0.4 : 0.7} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        <Skin
          color={color}
          fat={fat}
          rim={rim}
          surface={surface}
          tofu={tofu}
          top={top}
          box={whole}
          seed={seed}
          cooked={cooked}
          u={u}
        />
      </defs>

      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {result.heap && (
          <ellipse
            cx={fit.cx + 2}
            cy={fit.b - 2}
            rx={fit.w * 0.48}
            ry={Math.max(4, fit.h * 0.16)}
            fill={SHADE}
            opacity={0.22}
            filter={`url(#${u("shadow")})`}
          />
        )}
        {order.map(({ piece, index }) => (
          <Chunk
            key={index}
            piece={piece}
            index={index}
            thick={thick}
            color={color}
            k={k}
            shadow={!result.heap}
            crust={crust}
            u={u}
          />
        ))}
      </g>
    </Art>
  );
}
