import { useId } from "react";
import { snap } from "../core/frame";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import { smooth, type Pt } from "../core/rough";
import type { Cut, Layout } from "../core/cut";
import { bbox, centroid, polyPath } from "../core/geometry";
import { frameKnob, cutKnob, type KnobPiece } from "./knob-cuts";
import { knobGeometry, type KnobProps } from "./knob-shape";

const FLESH = "#f2dc8c";

/**
 * Ginger, galangal or turmeric lying flat: a chain of plump segments with stubby branches, pinched and
 * ringed at each joint, with fresh tips and a broken end showing the flesh. Peeled, it shows glossy flesh.
 */
export function Knob({ cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.3, ...props }: KnobProps) {
  const look = cooked ? knobLook(props.flesh ?? FLESH, cookedColor, browning) : null;
  if (cut !== "whole") return <CutKnob {...props} flesh={look?.flesh ?? props.flesh} cut={cut} layout={layout} look={look} />;
  return <WholeKnob {...props} look={look} />;
}

/** Where the flesh heads as it softens, as it browns, and as it crisps too far. */
const SOFT = "#ebbd52";
const CARAMEL = "#c7741e";
const CRUST = "#7a3608";
const BURNT = "#3a1d0a";

interface Look {
  flesh: string;
  crust: string;
  browning: number;
}

function knobLook(flesh: string, cookedColor: string | undefined, browning: number): Look {
  const b = Math.min(1, Math.max(0, browning));
  const cooked = mix(cookedColor ?? mix(flesh, SOFT, 0.3), CARAMEL, b * 0.75);
  /** Past 0.85 the edges catch and go dark, the way fried ginger turns bitter. */
  const burn = Math.max(0, b - 0.85) / 0.15;
  return { flesh: cooked, crust: mix(mix(cooked, CRUST, 0.55), BURNT, burn * 0.6), browning: b };
}


function WholeKnob({
  color: raw,
  flesh = FLESH,
  ring,
  tip: freshTip,
  shape = "hand",
  peeled = false,
  seed = 1,
  look,
  ...art
}: Omit<KnobProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { look: Look | null }) {
  /** Roasted whole, the skin darkens and the fresh pink tips are gone. */
  const color = look ? mix(raw, CARAMEL, 0.15 + look.browning * 0.4) : raw;
  const tip = look ? undefined : freshTip;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = snap(knobGeometry(shape, seed));
  const body = peeled ? flesh : color;
  const edge = outline(body, 0.6);
  const ringColor = peeled ? mix(flesh, SHADE, 0.22) : (ring ?? mix(color, SHADE, 0.4));
  const xs = g.segments.flatMap((s) => [s.center[0] - s.length / 2, s.center[0] + s.length / 2]);
  const [l, r] = [Math.min(...xs), Math.max(...xs)];
  /** Segments nearer the viewer (lower on the page) are drawn last, so each joint shows as an edge. */
  const order = g.segments.map((s, i) => ({ s, i })).sort((a, b) => a.s.center[1] - b.s.center[1]);
  /** The side of each segment facing the light, up and to the left, as a unit vector across it. */
  const lit = g.segments.map((s): [number, number] => {
    const n: [number, number] = [-s.dir[1], s.dir[0]];
    return n[0] + n[1] * 1.6 < 0 ? n : [-n[0], -n[1]];
  });

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.5} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1.2} />
        </filter>
        <filter id={u("skin")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={peeled ? "0.9" : "1.6"} numOctaves={2} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(body, SHADE, 0.5), peeled ? 1.2 : 1.1, peeled ? -0.65 : -0.42)} />
        </filter>
        <filter id={u("tone")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={seed + 7} />
          <feColorMatrix type="matrix" values={tint(mix(body, SHADE, 0.3), 1.4, -0.62)} />
        </filter>
        <filter id={u("fibre")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={seed + 3} />
          <feColorMatrix type="matrix" values={tint(mix(flesh, SHADE, 0.4), 2, -1.1)} />
        </filter>
        <clipPath id={u("body")}>
          {g.segments.map((s, i) => (
            <path key={i} d={s.path} />
          ))}
        </clipPath>
        {g.segments.map((s, i) => {
          const [nx, ny] = lit[i]!;
          const h = s.width * 0.55;
          return (
            <linearGradient
              key={i}
              id={u(`seg${i}`)}
              gradientUnits="userSpaceOnUse"
              x1={s.center[0] + nx * h}
              y1={s.center[1] + ny * h}
              x2={s.center[0] - nx * h}
              y2={s.center[1] - ny * h}
            >
              <stop offset="0" stopColor={mix(body, SHADE, 0.12)} />
              <stop offset="0.3" stopColor={lighten(body, peeled ? 0.4 : 0.26)} />
              <stop offset="0.6" stopColor={body} />
              <stop offset="1" stopColor={mix(body, SHADE, 0.45)} />
            </linearGradient>
          );
        })}
        <radialGradient id={u("gloss")}>
          <stop offset="0" stopColor={WHITE} stopOpacity={peeled ? 0.6 : 0.3} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {tip && (
          <radialGradient id={u("tip")}>
            <stop offset="0" stopColor={tip} stopOpacity={0.55} />
            <stop offset="1" stopColor={tip} stopOpacity={0} />
          </radialGradient>
        )}
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.09} />}
      </defs>

      <ellipse cx={(l + r) / 2 + 2} cy={g.bottom + 1} rx={(r - l) * 0.45} ry={4.5} fill={SHADE} opacity={0.28} filter={`url(#${u("shadow")})`} />
      {g.segments.map((s, i) => (
        <path key={`o${i}`} d={s.path} fill={edge} stroke={edge} strokeWidth={EDGE * 2} strokeLinejoin="round" />
      ))}
      {order.map(({ s, i }) => (
        <g key={`f${i}`}>
          <path d={s.path} fill={`url(#${u(`seg${i}`)})`} />
          <path d={s.path} fill="none" stroke={mix(body, SHADE, 0.35)} strokeWidth={1.4} opacity={0.5} filter={`url(#${u("soft")})`} />
        </g>
      ))}
      <g clipPath={`url(#${u("body")})`}>
        {!peeled && <rect x={l - 4} y={4} width={r - l + 8} height={g.bottom} filter={`url(#${u("tone")})`} />}
        <rect x={l - 4} y={4} width={r - l + 8} height={g.bottom} filter={`url(#${u("skin")})`} />
        {tip &&
          !peeled &&
          g.segments
            .filter((s) => s.tip)
            .map((s, i) => <circle key={i} cx={s.end[0]} cy={s.end[1]} r={s.width * 0.45} fill={`url(#${u("tip")})`} />)}
        <g fill="none" stroke={ringColor} strokeLinecap="round" filter={`url(#${u("fine")})`}>
          {g.segments.flatMap((s, i) =>
            s.rings.map((rg, j) => (
              <path key={`${i}-${j}`} d={smooth(rg, false)} strokeWidth={j === 0 ? 1.3 : 0.8} opacity={peeled ? 0.35 : j === 0 ? 0.85 : 0.55} />
            )),
          )}
        </g>
        {!peeled && (
          <g fill="none" stroke={mix(color, SHADE, 0.5)} strokeWidth={0.6} strokeLinecap="round" opacity={0.22} filter={`url(#${u("fine")})`}>
            {g.segments.flatMap((s, i) => s.wrinkles.map((w, j) => <path key={`${i}-${j}`} d={smooth(w, false)} />))}
          </g>
        )}
        {!peeled && (
          <g fill={ringColor} opacity={0.55}>
            {g.segments.flatMap((s, i) => s.dots.map(([x, y], j) => <circle key={`${i}-${j}`} cx={x} cy={y} r={0.45} />))}
          </g>
        )}
        {g.segments
          .filter((s) => s.tip)
          .map((s, i) => {
            /** The growing point at a finger's end, seen end-on as a small ringed bud. */
            const at: [number, number] = [s.end[0] - s.dir[0] * s.width * 0.2, s.end[1] - s.dir[1] * s.width * 0.2];
            const deg = (Math.atan2(s.dir[1], s.dir[0]) * 180) / Math.PI;
            const [rx, ry] = [s.width * 0.11, s.width * 0.2];
            return (
              <g key={i} transform={`rotate(${deg} ${at[0]} ${at[1]})`} fill="none" stroke={ringColor} strokeWidth={0.7} opacity={peeled ? 0.3 : 0.75}>
                <ellipse cx={at[0]} cy={at[1]} rx={rx} ry={ry} fill={lighten(body, 0.15)} />
                <ellipse cx={at[0] + rx * 0.15} cy={at[1]} rx={rx * 0.5} ry={ry * 0.5} />
              </g>
            );
          })}
        {look && (
          <>
            <rect x={l - 4} y={4} width={r - l + 8} height={g.bottom} filter={`url(#${u("brown")})`} />
            <g fill="none" stroke={look.crust} strokeWidth={2.6} opacity={0.2 + look.browning * 0.5} filter={`url(#${u("brownEdge")})`}>
              {g.segments.map((s, i) => (
                <path key={i} d={s.path} />
              ))}
            </g>
          </>
        )}
        {g.segments.map((s, i) => {
          const [cx, cy] = [s.center[0] + lit[i]![0] * s.width * 0.2, s.center[1] + lit[i]![1] * s.width * 0.2];
          const deg = (Math.atan2(s.dir[1], s.dir[0]) * 180) / Math.PI;
          return (
            <ellipse key={i} cx={cx} cy={cy} rx={s.length * 0.3} ry={s.width * 0.1} fill={`url(#${u("gloss")})`} transform={`rotate(${deg} ${cx} ${cy})`} />
          );
        })}
      </g>
      <g transform={`rotate(${g.cut.deg} ${g.cut.at[0]} ${g.cut.at[1]})`}>
        <ellipse cx={g.cut.at[0]} cy={g.cut.at[1]} rx={g.cut.rx} ry={g.cut.ry} fill={look ? mix(look.flesh, look.crust, 0.5) : flesh} stroke={edge} strokeWidth={EDGE * 0.7} />
        <ellipse cx={g.cut.at[0]} cy={g.cut.at[1]} rx={g.cut.rx * 0.9} ry={g.cut.ry * 0.9} filter={`url(#${u("fibre")})`} />
      </g>
    </Art>
  );
}

const open = (l: Pt[]) => `M${l.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;

function CutKnob({
  color,
  flesh = FLESH,
  ring: _ring,
  tip: _tip,
  shape = "hand",
  peeled = false,
  seed = 1,
  cut,
  layout,
  look,
  ...art
}: Omit<KnobProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { cut: Exclude<Cut, "whole">; layout: Layout; look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const { result, pieces: shown, fit, k } = frameKnob(shape, cut, seed, peeled, layout, !!look);
  const gr = result.grated;
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const edge = look ? mix(look.crust, SHADE, 0.3) : outline(flesh, 0.5);
  const sideFlesh = look ? mix(flesh, look.crust, 0.4) : mix(flesh, SHADE, 0.28);
  /** A pile shades as one heap; a single piece casts its own shadow. */
  const heap = result.heap && layout === "pile";
  const skin = look ? mix(color, CARAMEL, 0.2 + look.browning * 0.4) : color;
  const skinEdge = mix(skin, SHADE, 0.35);
  const fibre = mix(flesh, SHADE, 0.28);
  const edgeOf = (p: KnobPiece) => {
    const b = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.sqrt(b.w * b.h) / 14);
  };

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.4 / k} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.3 / k} />
        </filter>
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={1.3 / k} numOctaves={2} seed={seed} />
          <feColorMatrix type="matrix" values={tint(fibre, 1.1, -0.55)} />
        </filter>
        <radialGradient id={u("face")} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={lighten(flesh, look ? 0.18 : 0.45)} />
          <stop offset="0.6" stopColor={flesh} />
          <stop offset="1" stopColor={mix(flesh, SHADE, 0.14)} />
        </radialGradient>
        <radialGradient id={u("wet")} cx="0.3" cy="0.28" r="0.4">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.7} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} grain={0.18} />}
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {heap && (
          <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />
        )}
        {gr && <GratedMound g={gr} u={u} flesh={flesh} k={k} look={look} />}
        {order.map((p, i) => {
          const d = polyPath(p.outer);
          const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
          const layers = Math.max(1, Math.round(p.thick * k));
          return (
            <g key={i}>
              {!heap && (
                <path d={down(p.thick + (result.heap ? 1 : 2.5))} transform="translate(2 0)" fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />
              )}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={down(dy)} fill={p.skinSide ? mix(skin, SHADE, 0.12 * (dy / p.thick)) : sideFlesh} />
              ))}
              <path d={down(p.thick)} fill="none" stroke={p.skinSide ? mix(skin, SHADE, 0.6) : edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <path d={d} fill={`url(#${u("face")})`} />
              {!result.heap && (
                <>
                  <clipPath id={u(`c${i}`)}>
                    <path d={d} />
                  </clipPath>
                  <rect x={bbox(p.outer).l} y={bbox(p.outer).t} width={bbox(p.outer).w} height={bbox(p.outer).h} clipPath={`url(#${u(`c${i}`)})`} filter={`url(#${u("grain")})`} />
                </>
              )}
              {p.core && <path d={polyPath(p.core)} fill="none" stroke={fibre} strokeWidth={0.5} opacity={0.6} filter={`url(#${u("fine")})`} />}
              {p.fibres?.map((f, j) => (
                <path key={j} d={f.length > 2 ? smooth(f, false) : open(f)} fill="none" stroke={fibre} strokeWidth={result.heap ? 0.25 : 0.45} strokeLinecap="round" opacity={0.45} />
              ))}
              {p.specks && (
                <g fill={fibre} opacity={0.55}>
                  {p.specks.map(([x, y], j) => (
                    <circle key={j} cx={x} cy={y} r={0.28} />
                  ))}
                </g>
              )}
              {look && (
                /** Ginger colours evenly rather than searing in patches, so the browning builds slowly until it crisps. */
                <g opacity={0.2 + look.browning * 0.7}>
                  <Browned clip={u(`b${i}`)} d={d} box={bbox(p.outer)} crust={look.crust} browning={look.browning} u={u} edge={result.heap ? 0.9 : 1.8} />
                </g>
              )}
              {/* Raw flesh is wet; cooked pieces are dry, with only a little oil catching the light. */}
              <path d={d} fill={`url(#${u("wet")})`} opacity={look ? 0.3 * (1 - look.browning) : 1} />
              {p.rim && <path d={d} fill="none" stroke={skinEdge} strokeWidth={look ? 1 : 1.5} strokeLinejoin="round" />}
              <path d={d} fill="none" stroke={p.rim ? mix(skin, SHADE, 0.6) : edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}

/** Wet, stringy fibres heaped in a little pool of juice: domed, soft-edged, with strands poking out. */
function GratedMound({
  g,
  u,
  flesh,
  k,
  look,
}: {
  g: NonNullable<ReturnType<typeof cutKnob>["grated"]>;
  u: (n: string) => string;
  flesh: string;
  k: number;
  look: Look | null;
}) {
  const mound = smooth(g.mound, true);
  const juice = smooth(g.juice, true);
  const b = bbox(g.mound);
  const [jx, jy] = [bbox(g.juice).cx, bbox(g.juice).cy];
  /** Cooked, the juice is gone and the shreds brown at their tips. */
  const tones = look
    ? [look.crust, lighten(flesh, 0.3), mix(flesh, look.crust, 0.4 + look.browning * 0.3), flesh]
    : [mix(flesh, SHADE, 0.32), lighten(flesh, 0.55), mix(flesh, SHADE, 0.14), flesh];
  return (
    <>
      <radialGradient id={u("dome")} gradientUnits="userSpaceOnUse" cx={b.cx - b.w * 0.15} cy={b.cy - b.h * 0.3} r={b.w * 0.62}>
        <stop offset="0" stopColor={lighten(flesh, 0.4)} />
        <stop offset="0.55" stopColor={flesh} />
        <stop offset="1" stopColor={mix(flesh, SHADE, 0.3)} />
      </radialGradient>
      {look ? (
        <ellipse cx={b.cx + 2} cy={b.b} rx={b.w * 0.55} ry={3} fill={SHADE} opacity={0.22} filter={`url(#${u("shadow")})`} />
      ) : (
        <>
          <path d={juice} fill={mix(flesh, SHADE, 0.08)} opacity={0.4} />
          <path d={juice} fill="none" stroke={mix(flesh, SHADE, 0.35)} strokeWidth={0.5} opacity={0.45} />
          <ellipse cx={jx + 14} cy={jy + 5} rx={6} ry={1.3} fill={WHITE} opacity={0.6} filter={`url(#${u("fine")})`} />
        </>
      )}
      <path d={mound} transform="translate(0.6 1.6)" fill={mix(flesh, SHADE, 0.35)} opacity={0.6} filter={`url(#${u("fine")})`} />
      <path d={mound} fill={`url(#${u("dome")})`} />
      <g fill="none" strokeLinecap="round">
        {g.strands.map((s, i) => (
          <path key={i} d={smooth(s, false)} stroke={tones[i % 4]} strokeWidth={(i % 4 === 1 ? 0.75 : 0.55) / Math.sqrt(k / 1.5)} opacity={0.9} />
        ))}
      </g>
      <g fill={WHITE} opacity={look ? 0.35 : 0.75} filter={`url(#${u("fine")})`}>
        {[
          [-0.3, -0.45, 2.4],
          [0.05, -0.55, 1.6],
          [-0.05, -0.2, 1.2],
          [0.3, -0.3, 1.4],
        ].map(([x, y, r], i) => (
          <ellipse key={i} cx={b.cx + x! * b.w * 0.5} cy={b.cy + y! * b.h * 0.5} rx={r} ry={r! * 0.45} />
        ))}
      </g>
    </>
  );
}
