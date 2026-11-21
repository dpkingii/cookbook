import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { Glints, sprinkle } from "../core/Imperfect";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import type { Cut } from "../core/cut";
import { bbox, centroid, polyPath } from "../core/geometry";
import { rng, smooth, type Pt } from "../core/rough";
import { frameBulb, type LayerPiece } from "./bulb-cuts";
import { bulbGeometry, type BulbProps } from "./bulb-shape";

const ROOT_HAIR = "#b99a6a";

/**
 * An onion, red onion or shallot sitting on the counter: papery skin with veins running neck to root,
 * a dry pointed neck and a tuft of roots. Peeled, it shows glossy flesh with faint layer lines instead.
 */
export function Bulb({ cooked = false, cookedColor, browning = 0.3, ...props }: BulbProps) {
  const look = cooked ? cookedLook(props.flesh ?? FLESH, props.ring, cookedColor, browning) : null;
  const shown = look ? { ...props, flesh: look.flesh, ring: look.ring, peeled: true } : props;
  return shown.cut && shown.cut !== "whole" ? (
    <CutBulb {...shown} cut={shown.cut} look={look} />
  ) : (
    <WholeBulb {...shown} look={look} />
  );
}

const FLESH = "#f4efdc";
/** Where onion flesh heads as it softens and turns see-through. */
const SOFT = "#ead48e";
/** Where it heads as it caramelizes. */
const CARAMEL = "#a4581c";
const BURNT = "#4a230c";

interface Look {
  flesh: string;
  ring?: string;
  /** Colour of the browned patches and edges. */
  crust: string;
  browning: number;
}

function cookedLook(flesh: string, ring: string | undefined, cookedColor: string | undefined, browning: number): Look {
  const b = Math.min(1, Math.max(0, browning));
  /** Red onion and shallot keep a mauve tint when cooked, fading as they brown. */
  const soft = cookedColor ?? (ring ? mix(mix(flesh, ring, 0.4), SOFT, 0.3) : mix(flesh, SOFT, 0.55));
  const cooked = mix(soft, CARAMEL, b * 0.75);
  return { flesh: cooked, ring: ring && mix(ring, cooked, 0.3 + b * 0.4), crust: mix(cooked, BURNT, 0.45), browning: b };
}


/** Yellow and white onion layers have a faint green-gold edge; red onion and shallot pass their own `ring`. */
const LAYER_EDGE = "#c9b56a";

function CutBulb({
  color,
  flesh = FLESH,
  ring: ringColor,
  shape = "round",
  peeled = false,
  cut,
  layout = "pile",
  seed = 1,
  look,
  ...art
}: BulbProps & { cut: Exclude<Cut, "whole">; look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const { result, pieces: shown, fit, k } = frameBulb(shape, cut, seed, peeled, layout, !!look);
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const layerLine = ringColor ?? mix(flesh, LAYER_EDGE, 0.55);
  const edge = look ? mix(flesh, BURNT, 0.5) : outline(ringColor ?? mix(flesh, LAYER_EDGE, 0.4), 0.4);
  const sideFlesh = look
    ? mix(flesh, CARAMEL, 0.3 + look.browning * 0.3)
    : mix(flesh, SHADE, result.heap ? 0.1 : 0.2);
  /** Small pieces get a finer edge, so a heap of dice reads as onion and not as a dark mesh. */
  const edgeOf = (p: LayerPiece) => {
    const b = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.max(b.w, b.h) / 16);
  };
  const path = (p: LayerPiece, dy = 0) => {
    const at = (pts: Pt[]) => polyPath(pts.map(([x, y]): Pt => [x, y + dy]));
    return at(p.outer) + (p.hole ? at(p.hole) : "");
  };
  const line = (p: LayerPiece, l: Pt[]) =>
    p.closed ? polyPath(l) : `M${l.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.6 / k} />
        </filter>
        <radialGradient id={u("face")} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={lighten(flesh, 0.55)} />
          <stop offset="0.6" stopColor={flesh} />
          <stop offset="1" stopColor={mix(flesh, layerLine, 0.3)} />
        </radialGradient>
        <radialGradient id={u("wet")} cx="0.32" cy="0.28" r="0.45">
          <stop offset="0" stopColor={WHITE} stopOpacity={look ? 0.9 : 0.75} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} />}
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {result.heap && (
          <ellipse
            cx={fit.cx + 2}
            cy={fit.b - 2}
            rx={fit.w * 0.48}
            ry={Math.max(3, fit.h * 0.15)}
            fill={SHADE}
            opacity={0.2}
            filter={`url(#${u("shadow")})`}
          />
        )}
        {order.map((p, i) => {
          const layers = Math.max(1, Math.round(p.thick * k));
          const side = p.skinSide ? color : sideFlesh;
          return (
            <g key={i}>
              {!result.heap && (
                <path
                  d={path(p, p.thick + 2.5)}
                  transform="translate(2 0)"
                  fill={SHADE}
                  fillRule="evenodd"
                  opacity={0.24}
                  filter={`url(#${u("shadow")})`}
                />
              )}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={path(p, dy)} fill={side} fillRule="evenodd" />
              ))}
              <path d={path(p, p.thick)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <path d={path(p)} fill={`url(#${u("face")})`} fillRule="evenodd" />
              <g fill="none" stroke={layerLine} strokeLinecap="round" strokeLinejoin="round">
                {p.lines.map((l, j) => (
                  <path key={j} d={line(p, l)} strokeWidth={0.9} opacity={look ? 0.45 : 0.75} />
                ))}
              </g>
              {look && (
                <Browned clip={u(`clip${i}`)} d={path(p)} box={bbox(p.outer)} crust={look.crust} browning={look.browning} u={u} />
              )}
              <path d={path(p)} fill={`url(#${u("wet")})`} fillRule="evenodd" />
              {!result.heap && <CutGlints outer={p.outer} seed={seed * 11 + i} />}
              {p.skinSide && (
                <path d={path(p)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
              )}
              <path d={path(p)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}

function WholeBulb({
  color,
  flesh = FLESH,
  ring: ringColor,
  shape = "round",
  peeled = false,
  seed = 1,
  cut: _cut,
  layout: _layout,
  look,
  ...art
}: BulbProps & { look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = bulbGeometry(shape, seed, peeled);
  const rand = rng(seed * 7 + 1);
  const body = peeled ? flesh : color;
  const edge = look ? mix(body, BURNT, 0.6) : outline(body, 0.72);
  const d = smooth(g.pts, true);
  const vein = peeled ? mix(flesh, ringColor ?? SHADE, 0.3) : mix(color, SHADE, 0.45);
  const bottom = Math.max(...g.pts.map((p) => p[1]));

  const hairs = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 2 + ((i - 3.5) / 3.5) * 0.9 + (rand() * 2 - 1) * 0.15;
    const len = 5 + rand() * 6;
    const [x0, y0] = [g.root[0] + (i - 3.5) * 0.9, g.root[1] + 1];
    const pts: Pt[] = [0, 1, 2].map((k) => [
      x0 + Math.cos(a) * len * (k / 2) + (k === 1 ? (rand() * 2 - 1) * 1.6 : 0),
      y0 + Math.sin(a) * len * (k / 2),
    ]);
    return smooth(pts, false);
  });

  return (
    <Art {...art}>
      <defs>
        <clipPath id={u("body")}>
          <path d={d} />
        </clipPath>
        <filter id={u("shadow")} x="-30%" y="-50%" width="160%" height="200%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.45} />
        </filter>
        <filter id={u("papery")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.045" numOctaves={3} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(color, SHADE, 0.5), 1.3, -0.5)} />
        </filter>
        <radialGradient
          id={u("shade")}
          gradientUnits="userSpaceOnUse"
          cx={g.cx - g.rx * 0.38}
          cy={g.cy - g.ry * 0.4}
          r={Math.max(g.rx, g.ry) * 1.55}
        >
          <stop offset="0" stopColor={lighten(body, peeled ? 0.45 : 0.3)} />
          <stop offset="0.5" stopColor={body} />
          <stop offset="1" stopColor={mix(body, SHADE, peeled ? 0.3 : 0.45)} />
        </radialGradient>
        <radialGradient id={u("gloss")}>
          <stop offset="0" stopColor={WHITE} stopOpacity={peeled ? 0.85 : 0.45} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.07} />}
      </defs>

      <ellipse
        cx={g.cx + 3}
        cy={bottom + 1}
        rx={g.rx * 0.82}
        ry={4.5}
        fill={SHADE}
        opacity={0.3}
        filter={`url(#${u("shadow")})`}
      />
      {!peeled && (
        <g fill="none" stroke={ROOT_HAIR} strokeWidth={1.1} strokeLinecap="round">
          {hairs.map((h, i) => (
            <path key={i} d={h} />
          ))}
        </g>
      )}
      <path d={d} fill={`url(#${u("shade")})`} />
      <g clipPath={`url(#${u("body")})`}>
        {!peeled && (
          <rect
            x={g.cx - g.rx - 10}
            y={g.tip[1] - 4}
            width={g.rx * 2 + 20}
            height={bottom - g.tip[1] + 8}
            filter={`url(#${u("papery")})`}
            transform={`rotate(${g.lean} ${g.cx} ${g.cy})`}
          />
        )}
        {look && (
          <rect
            x={g.cx - g.rx - 4}
            y={g.tip[1] - 4}
            width={g.rx * 2 + 8}
            height={bottom - g.tip[1] + 8}
            filter={`url(#${u("brown")})`}
          />
        )}
        <g fill="none" stroke={vein} strokeLinecap="round" filter={`url(#${u("fine")})`}>
          {g.veins.map((v, i) => (
            <path key={i} d={smooth(v, false)} strokeWidth={peeled ? 0.7 : 0.9} opacity={peeled ? 0.55 : 0.6} />
          ))}
        </g>
        <ellipse
          cx={g.cx - g.rx * 0.38}
          cy={g.cy - g.ry * 0.38}
          rx={g.rx * 0.32}
          ry={g.ry * 0.24}
          fill={`url(#${u("gloss")})`}
          transform={`rotate(-30 ${g.cx - g.rx * 0.38} ${g.cy - g.ry * 0.38})`}
        />
      </g>
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE} strokeLinejoin="round" />
      {peeled ? (
        <ellipse cx={g.tip[0]} cy={g.tip[1] + 1} rx={3.2} ry={1.4} fill={mix(flesh, SHADE, 0.35)} stroke={edge} strokeWidth={EDGE * 0.6} />
      ) : (
        <g stroke={edge} strokeWidth={EDGE * 0.6} strokeLinecap="round" strokeLinejoin="round">
          <path
            d={`M${g.tip[0] - 2.4} ${g.tip[1] + 6}Q${g.tip[0] - 0.6} ${g.tip[1] + 2} ${g.tip[0] + 0.4} ${g.tip[1] - 3}Q${g.tip[0] + 0.8} ${g.tip[1] + 2} ${g.tip[0] + 2.4} ${g.tip[1] + 6}Z`}
            fill={mix(color, SHADE, 0.35)}
          />
          <path
            d={`M${g.tip[0] + 0.4} ${g.tip[1] - 3}q${1 + rand()} -3 ${2.5 + rand()} -4`}
            fill="none"
            stroke={mix(color, SHADE, 0.3)}
          />
        </g>
      )}
      <ellipse
        cx={g.root[0]}
        cy={g.root[1]}
        rx={g.rx * 0.16}
        ry={1.8}
        fill={peeled ? mix(flesh, SHADE, 0.3) : mix(color, SHADE, 0.5)}
        opacity={0.85}
      />
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
