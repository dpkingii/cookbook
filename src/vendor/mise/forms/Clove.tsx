import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { Glints, sprinkle } from "../core/Imperfect";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import { rng, smooth, type Pt } from "../core/rough";
import type { Cut, Layout } from "../core/cut";
import { bbox, centroid, polyPath } from "../core/geometry";
import { frameGarlic, type GarlicPiece } from "./clove-cuts";
import { cloveGeometry, headGeometry, type CloveProps, type ClovePart } from "./clove-shape";

const SKIN = "#efe7da";
const FLESH = "#f1e4bd";
const ROOT = "#c7ad80";

/** Garlic: a whole head, or one clove in its skin or peeled. */
export function Clove({
  part = "clove",
  cut = "whole",
  layout = "pile",
  cooked = false,
  cookedColor,
  browning = 0.3,
  ...props
}: CloveProps) {
  const look = cooked ? garlicLook(props.flesh ?? FLESH, cookedColor, browning) : null;
  const keepsSkin = part === "head" && (cut === "whole" || cut === "halved");
  const shown = look ? { ...props, flesh: look.flesh, peeled: !keepsSkin || props.peeled } : props;
  if (cut !== "whole") return <CutGarlic {...shown} part={part} cut={cut} layout={layout} look={look} />;
  return part === "head" ? <Head {...shown} look={look} /> : <SingleClove {...shown} look={look} />;
}

/** Where garlic heads as it softens, as it browns, and as it burns. */
const SOFT = "#ecd9a0";
const CARAMEL = "#b5702a";
const BURNT = "#3a1d0a";

interface Look {
  flesh: string;
  crust: string;
  browning: number;
}

function garlicLook(flesh: string, cookedColor: string | undefined, browning: number): Look {
  const b = Math.min(1, Math.max(0, browning));
  const cooked = mix(cookedColor ?? mix(flesh, SOFT, 0.5), CARAMEL, b * 0.8);
  /** Past 0.8 garlic turns bitter: the edges go from brown toward black. */
  const burn = Math.max(0, b - 0.8) / 0.2;
  return { flesh: cooked, crust: mix(mix(cooked, BURNT, 0.4), BURNT, burn * 0.65), browning: b };
}


const GERM = "#b9b85f";

function CutGarlic({
  color = SKIN,
  flesh = FLESH,
  part,
  cut,
  layout,
  peeled = false,
  seed = 1,
  streak: _streak,
  look,
  ...art
}: Omit<CloveProps, "cut" | "layout" | "part"> & { part: ClovePart; cut: Exclude<Cut, "whole">; layout: Layout; look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u: Ids = (name) => `${id}-${name}`;
  const { result, pieces: shown, fit, k } = frameGarlic(part, cut, seed, peeled, layout, !!look);
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const edge = look ? mix(look.crust, SHADE, 0.3) : outline(flesh, 0.45);
  const sideFlesh = look ? mix(flesh, look.crust, 0.35) : mix(flesh, SHADE, result.heap ? 0.1 : 0.18);
  const edgeOf = (p: GarlicPiece) => {
    const b = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.max(b.w, b.h) / 14);
  };
  const open = (l: Pt[]) => `M${l.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.4 / k} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.35 / k} />
        </filter>
        <radialGradient id={u("face")} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={lighten(flesh, 0.55)} />
          <stop offset="0.6" stopColor={flesh} />
          <stop offset="1" stopColor={mix(flesh, SHADE, 0.12)} />
        </radialGradient>
        <radialGradient id={u("wet")} cx="0.3" cy="0.28" r="0.4">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.8} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} grain={0.16} />}
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {result.heap && (
          <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />
        )}
        {order.map((p, i) => {
          const d = polyPath(p.outer);
          const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
          const layers = Math.max(1, Math.round(p.thick * k));
          return (
            <g key={i}>
              {p.skin?.map((s, j) => (
                <path key={j} d={polyPath(s)} fill={color} stroke={mix(color, SHADE, 0.35)} strokeWidth={0.5} opacity={0.9} />
              ))}
              {!result.heap && (
                <path d={down(p.thick + 2.5)} transform="translate(2 0)" fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />
              )}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={down(dy)} fill={p.skinSide ? (look ? mix(color, CARAMEL, 0.4) : color) : sideFlesh} />
              ))}
              <path d={down(p.thick)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              {p.section ? (
                <>
                  <path d={d} fill={mix(color, "#d9c8a4", 0.5)} />
                  {p.section.cloves.map((c, j) => (
                    <g key={j}>
                      <path d={polyPath(c)} fill={`url(#${u("face")})`} />
                      <path d={polyPath(c)} fill="none" stroke={mix(flesh, SHADE, 0.3)} strokeWidth={0.7} />
                      <path d={polyPath(c)} fill="none" stroke={WHITE} strokeWidth={0.6} opacity={0.7} transform="translate(-0.4 -0.4)" />
                    </g>
                  ))}
                  <path d={polyPath(p.section.core)} fill={mix(color, "#b8935a", 0.55)} />
                </>
              ) : (
                <path d={d} fill={`url(#${u("face")})`} />
              )}
              {p.germ && <path d={open(p.germ)} fill="none" stroke={GERM} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} filter={`url(#${u("fine")})`} />}
              {p.cracks?.map((c, j) => (
                <path key={j} d={open(c)} fill="none" stroke={mix(flesh, SHADE, 0.4)} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
              ))}
              {look && !p.section && (
                <Browned clip={u(`clip${i}`)} d={d} box={bbox(p.outer)} crust={look.crust} browning={look.browning} u={u} edge={1.8} />
              )}
              {look && p.section && (
                <g fill="none" stroke={look.crust} strokeWidth={1.4} opacity={0.3 + look.browning * 0.5} filter={`url(#${u("brownEdge")})`}>
                  {p.section.cloves.map((c, j) => (
                    <path key={j} d={polyPath(c)} />
                  ))}
                </g>
              )}
              <path d={d} fill={`url(#${u("wet")})`} />
              {!result.heap && <CutGlints outer={p.outer} seed={seed * 11 + i} />}
              {p.skinSide && <path d={d} fill="none" stroke={look ? mix(color, CARAMEL, 0.4) : color} strokeWidth={1.6} strokeLinejoin="round" />}
              <path d={d} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}

type Ids = (name: string) => string;

/** Shared defs: soft shadow, fine blur, papery streaks and a white gloss. */
function Defs({ u, skin, seed, gloss }: { u: Ids; skin: string; seed: number; gloss: number }) {
  return (
    <>
      <filter id={u("shadow")} x="-30%" y="-60%" width="160%" height="220%">
        <feGaussianBlur stdDeviation={3} />
      </filter>
      <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={0.5} />
      </filter>
      <filter id={u("papery")} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85 0.05" numOctaves={3} seed={seed} />
        <feColorMatrix type="matrix" values={tint(mix(skin, SHADE, 0.45), 1.2, -0.5)} />
      </filter>
      <radialGradient id={u("gloss")}>
        <stop offset="0" stopColor={WHITE} stopOpacity={gloss} />
        <stop offset="1" stopColor={WHITE} stopOpacity={0} />
      </radialGradient>
    </>
  );
}

function roots(at: Pt, count: number, spread: number, seed: number): string[] {
  const rand = rng(seed * 5 + 2);
  return Array.from({ length: count }, (_, i) => {
    const mid = (count - 1) / 2;
    const a = Math.PI / 2 + ((i - mid) / mid) * spread + (rand() * 2 - 1) * 0.12;
    const len = 6 + rand() * 5;
    const [x0, y0] = [at[0] + (i - mid) * 1.1, at[1] + 0.5];
    const pts: Pt[] = [0, 1, 2].map((k) => [
      x0 + Math.cos(a) * len * (k / 2) + (k === 1 ? (rand() * 2 - 1) * 1.2 : 0),
      y0 + Math.sin(a) * len * (k / 2),
    ]);
    return smooth(pts, false);
  });
}

function Head({
  color: raw = SKIN,
  streak,
  seed = 1,
  peeled: _peeled,
  flesh: _flesh,
  look,
  ...art
}: Omit<CloveProps, "part"> & { look: Look | null }) {
  /** A roasted head's papery skin browns too. */
  const color = look ? mix(raw, CARAMEL, 0.15 + look.browning * 0.35) : raw;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u: Ids = (name) => `${id}-${name}`;
  const g = headGeometry(seed);
  const rand = rng(seed * 3 + 1);
  const d = smooth(g.pts, true);
  const edge = outline(color, 0.6);
  const groove = mix(color, SHADE, 0.35);

  return (
    <Art {...art}>
      <defs>
        <Defs u={u} skin={color} seed={seed} gloss={0.5} />
        <clipPath id={u("body")}>
          <path d={d} />
        </clipPath>
        <radialGradient
          id={u("shade")}
          gradientUnits="userSpaceOnUse"
          cx={g.cx - g.rx * 0.35}
          cy={g.cy - g.ry * 0.45}
          r={g.rx * 1.6}
        >
          <stop offset="0" stopColor={lighten(color, 0.6)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={mix(color, SHADE, 0.35)} />
        </radialGradient>
        <linearGradient id={u("streaks")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor={streak ?? color} stopOpacity={0} />
          <stop offset="1" stopColor={streak ?? color} stopOpacity={0.55} />
        </linearGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.08} />}
      </defs>

      <ellipse cx={g.cx + 3} cy={g.bottom + 1} rx={g.rx * 0.85} ry={4.5} fill={SHADE} opacity={0.28} filter={`url(#${u("shadow")})`} />
      <g fill="none" stroke={ROOT} strokeWidth={1.1} strokeLinecap="round">
        {roots(g.root, 11, 1.1, seed).map((r, i) => (
          <path key={i} d={r} />
        ))}
      </g>
      <path d={d} fill={`url(#${u("shade")})`} />
      <g clipPath={`url(#${u("body")})`}>
        <rect
          x={g.cx - g.rx - 6}
          y={g.stalk[1]}
          width={g.rx * 2 + 12}
          height={g.bottom - g.stalk[1] + 4}
          filter={`url(#${u("papery")})`}
          transform={`rotate(${g.lean} ${g.cx} ${g.cy})`}
        />
        {streak && (
          <g stroke={`url(#${u("streaks")})`} strokeLinecap="round" filter={`url(#${u("fine")})`} fill="none">
            {g.grooves.flatMap((line, i) =>
              [-3, 3].map((off) => (
                <path
                  key={`${i}${off}`}
                  d={smooth(line.map(([x, y]): Pt => [x + off + (rand() * 2 - 1), y]), false)}
                  strokeWidth={2.4}
                />
              )),
            )}
          </g>
        )}
        <g fill="none" stroke={groove} strokeLinecap="round" filter={`url(#${u("fine")})`}>
          {g.grooves.map((line, i) => (
            <path key={i} d={smooth(line, false)} strokeWidth={1.3} opacity={0.75} />
          ))}
        </g>
        <g fill="none" stroke={WHITE} strokeLinecap="round" filter={`url(#${u("fine")})`} opacity={0.6}>
          {g.grooves.map((line, i) => (
            <path key={i} d={smooth(line.map(([x, y]): Pt => [x - 2.2, y]), false)} strokeWidth={1.2} />
          ))}
        </g>
        <ellipse
          cx={g.cx - g.rx * 0.35}
          cy={g.cy - g.ry * 0.35}
          rx={g.rx * 0.3}
          ry={g.ry * 0.25}
          fill={`url(#${u("gloss")})`}
        />
      </g>
      {look && <Browned clip={u("roast")} d={d} box={bbox(g.pts)} crust={look.crust} browning={look.browning} u={u} />}
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE} strokeLinejoin="round" />
      <ellipse cx={g.root[0]} cy={g.root[1]} rx={g.rx * 0.2} ry={2} fill={mix(color, SHADE, 0.45)} opacity={0.8} />
      <path
        d={`M${g.stalk[0] - 2.6} ${g.stalk[1] + 9}L${g.stalk[0] - 2.2} ${g.stalk[1]}L${g.stalk[0] + 2.2} ${g.stalk[1]}L${g.stalk[0] + 2.6} ${g.stalk[1] + 9}Z`}
        fill={mix(color, "#c9b48c", 0.6)}
        stroke={edge}
        strokeWidth={EDGE * 0.7}
        strokeLinejoin="round"
      />
      <ellipse cx={g.stalk[0]} cy={g.stalk[1]} rx={2.2} ry={0.9} fill={mix(color, SHADE, 0.3)} stroke={edge} strokeWidth={EDGE * 0.5} />
    </Art>
  );
}

function SingleClove({
  color = SKIN,
  flesh = FLESH,
  streak,
  peeled = false,
  seed = 1,
  look,
  ...art
}: Omit<CloveProps, "part"> & { look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u: Ids = (name) => `${id}-${name}`;
  const g = cloveGeometry(seed);
  const body = peeled ? flesh : color;
  const d = smooth(g.pts, true);
  const edge = outline(body, peeled ? 0.5 : 0.6);
  const xs = g.pts.map((p) => p[0]);
  const [l, r] = [Math.min(...xs), Math.max(...xs)];
  const top = Math.min(...g.pts.map((p) => p[1]));

  return (
    <Art {...art}>
      <defs>
        <Defs u={u} skin={color} seed={seed} gloss={peeled ? 0.9 : 0.55} />
        <clipPath id={u("body")}>
          <path d={d} />
        </clipPath>
        <linearGradient id={u("shade")} gradientUnits="userSpaceOnUse" x1={l} y1={top} x2={r} y2={g.bottom}>
          <stop offset="0" stopColor={lighten(body, peeled ? 0.5 : 0.6)} />
          <stop offset="0.45" stopColor={body} />
          <stop offset="1" stopColor={mix(body, SHADE, peeled ? 0.25 : 0.3)} />
        </linearGradient>
        <linearGradient id={u("streaks")} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={streak ?? color} stopOpacity={0.6} />
          <stop offset="0.7" stopColor={streak ?? color} stopOpacity={0} />
        </linearGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.1} />}
      </defs>

      <ellipse cx={g.base[0] + 3} cy={g.bottom + 1} rx={13} ry={3.4} fill={SHADE} opacity={0.3} filter={`url(#${u("shadow")})`} />
      <path d={d} fill={`url(#${u("shade")})`} />
      <g clipPath={`url(#${u("body")})`}>
        {!peeled && (
          <rect x={l - 4} y={top - 4} width={r - l + 8} height={g.bottom - top + 8} filter={`url(#${u("papery")})`} transform={`rotate(${g.lean} ${g.base[0]} ${g.base[1]})`} />
        )}
        {!peeled && streak && <path d={d} fill={`url(#${u("streaks")})`} />}
        <path d={smooth(g.ridge, false)} fill="none" stroke={WHITE} strokeWidth={2.2} strokeLinecap="round" opacity={peeled ? 0.7 : 0.55} filter={`url(#${u("fine")})`} />
        <path
          d={smooth(g.ridge.map(([x, y]): Pt => [x + 2.4, y]), false)}
          fill="none"
          stroke={mix(body, SHADE, 0.3)}
          strokeWidth={1}
          strokeLinecap="round"
          opacity={0.45}
          filter={`url(#${u("fine")})`}
        />
        <ellipse cx={l + (r - l) * 0.32} cy={top + (g.bottom - top) * 0.4} rx={(r - l) * 0.18} ry={(g.bottom - top) * 0.2} fill={`url(#${u("gloss")})`} />
      </g>
      {look && <Browned clip={u("roast")} d={d} box={bbox(g.pts)} crust={look.crust} browning={look.browning} u={u} />}
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE} strokeLinejoin="round" />
      <ellipse
        cx={g.base[0]}
        cy={g.base[1] - 0.6}
        rx={8.5}
        ry={2}
        fill={peeled ? mix(flesh, "#b8935a", 0.45) : mix(color, "#b8935a", 0.5)}
        transform={`rotate(${g.lean} ${g.base[0]} ${g.base[1]})`}
      />
      {!peeled && (
        <path
          d={`M${g.tip[0]} ${g.tip[1] + 1}q${1.5} -3 ${3.5} -5`}
          fill="none"
          stroke={mix(color, SHADE, 0.4)}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      )}
    </Art>
  );
}

/** A freshly cut face is wet: a couple of slivers of light, never a perfectly even sheen. */
function CutGlints({ outer, seed }: { outer: Pt[]; seed: number }) {
  const rand = rng(seed);
  const b = bbox(outer);
  const at = sprinkle(outer, 3, rand, 0.22);
  return <Glints at={at} r={at.map(() => Math.min(b.w, b.h) * (0.018 + rand() * 0.018))} opacity={0.8} stretch={2.4} />;
}
