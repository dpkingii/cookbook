import { useId } from "react";
import { snap } from "../core/frame";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import type { Cut, Layout } from "../core/cut";
import { bbox, polyPath } from "../core/geometry";
import { smooth, type Pt } from "../core/rough";
import { frameRoot, type RootPiece } from "./root-cuts";
import { palette, rootLook, type RootLook, type RootPalette } from "./root-look";
import { FLESH, rootGeometry, SKIN, type RootProps, type RootShape } from "./root-shape";
import { band } from "./stalk-shape";

/**
 * A carrot, daikon or potato lying on the counter. Carrot and daikon are shaded round like a tube, ringed with
 * shallow creases and whiskered with root hairs; a potato is a lumpy oval, freckled and dotted with eyes.
 */
export function Root({ cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.35, ...props }: RootProps) {
  const shape = props.shape ?? "carrot";
  const raw = props.flesh ?? (shape === "carrot" ? mix(FLESH.carrot, props.color, 0.35) : FLESH[shape]);
  const look = cooked ? rootLook(shape, raw, cookedColor, browning) : null;
  if (cut !== "whole") return <CutRoot {...props} shape={shape} cut={cut} layout={layout} look={look} />;
  return <WholeRoot {...props} shape={shape} look={look} />;
}

type Inner = Omit<RootProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { shape: RootShape; look: RootLook | null };

const LEAF = "#5f9a3a";

function WholeRoot({ color = SKIN.carrot, flesh, core, shoulder, shape, tops = false, peeled = false, seed = 1, look, ...art }: Inner) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = snap(rootGeometry(shape, seed, tops && !look));
  const pal = palette(shape, color, flesh, core, shoulder, look);
  /** Peeled, the root is its flesh all over, a little glossier. */
  const body = peeled ? pal.flesh : pal.skin;
  const d = smooth(g.outline, true);
  const edge = outline(body, 0.55);
  const crease = mix(body, SHADE, shape === "carrot" ? 0.35 : 0.22);
  const b = bbox(g.outline);
  const tube = g.spine && g.widths;
  const daikonShoulder = shape === "daikon" && !peeled;

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={shape === "potato" ? 2.2 : 1.1} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.3} />
        </filter>
        {/* Skin texture: streaked along a taproot, mottled on a potato. */}
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={shape === "potato" ? "0.55" : "0.25 1.4"} numOctaves={3} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(body, SHADE, 0.5), shape === "potato" ? 1.3 : 0.9, shape === "potato" ? -0.5 : -0.45)} />
        </filter>
        <clipPath id={u("body")}>
          <path d={d} />
        </clipPath>
        {tube ? (
          <linearGradient id={u("along")} gradientUnits="userSpaceOnUse" x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]}>
            <stop offset="0" stopColor={daikonShoulder ? mix(body, pal.shoulder, 0.75) : body} />
            <stop offset={daikonShoulder ? 0.22 : 0.5} stopColor={daikonShoulder ? mix(body, pal.shoulder, 0.25) : body} />
            <stop offset={daikonShoulder ? 0.4 : 1} stopColor={body} />
          </linearGradient>
        ) : (
          <radialGradient id={u("along")} gradientUnits="userSpaceOnUse" cx={b.cx - b.w * 0.18} cy={b.cy - b.h * 0.25} r={b.w * 0.62}>
            <stop offset="0" stopColor={lighten(body, peeled ? 0.3 : 0.16)} />
            <stop offset="0.55" stopColor={body} />
            <stop offset="1" stopColor={mix(body, SHADE, 0.3)} />
          </radialGradient>
        )}
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.1} />}
      </defs>

      <ellipse cx={b.cx + 2} cy={g.bottom + 1} rx={b.w * 0.44} ry={shape === "potato" ? 5 : 3.6} fill={SHADE} opacity={0.26} filter={`url(#${u("shadow")})`} />
      {g.stems.map((s, i) => (
        <g key={`s${i}`} fill="none" strokeLinecap="round">
          <path d={smooth(s, false)} stroke={mix(LEAF, SHADE, 0.45)} strokeWidth={tops ? 1.7 : 2.8} />
          <path d={smooth(s, false)} stroke={look ? mix(LEAF, "#7a6a2a", 0.5) : LEAF} strokeWidth={tops ? 0.9 : 1.8} />
        </g>
      ))}
      {g.leaflets.map((l, i) => (
        <path key={`l${i}`} d={smooth(l, true)} fill={i % 3 ? LEAF : lighten(LEAF, 0.15)} stroke={mix(LEAF, SHADE, 0.5)} strokeWidth={0.35} />
      ))}
      <g fill="none" stroke={mix(body, SHADE, 0.3)} strokeLinecap="round" strokeWidth={0.45} opacity={peeled ? 0 : 0.85}>
        {g.hairs.map((h, i) => (
          <path key={i} d={smooth(h, false)} strokeWidth={i === 0 ? 0.8 : 0.45} />
        ))}
      </g>
      <path d={d} fill={`url(#${u("along")})`} />
      <g clipPath={`url(#${u("body")})`}>
        <rect x={b.l - 2} y={b.t - 2} width={b.w + 4} height={b.h + 4} filter={`url(#${u("grain")})`} opacity={peeled ? 0.25 : shape === "daikon" ? 0.35 : 0.6} />
        {tube && (
          <>
            <path d={smooth(band(g.spine!, g.widths!, -0.8, -0.25), true)} fill={WHITE} opacity={peeled ? 0.45 : 0.32} filter={`url(#${u("soft")})`} />
            <path d={smooth(band(g.spine!, g.widths!, 0.3, 1.3), true)} fill={SHADE} opacity={0.3} filter={`url(#${u("soft")})`} />
          </>
        )}
        {!tube && (
          /** A potato's darker patches, where the skin is thicker or earthier. */
          <g fill={mix(body, SHADE, 0.35)} opacity={peeled ? 0 : 0.25} filter={`url(#${u("soft")})`}>
            {g.specks.slice(0, 4).map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx={5 + (i % 2) * 3} ry={3 + (i % 3)} />
            ))}
          </g>
        )}
        <g fill="none" strokeLinecap="round" filter={`url(#${u("fine")})`}>
          {g.rings.map((r, i) => (
            <g key={i}>
              <path d={smooth(r, false)} stroke={crease} strokeWidth={0.6} opacity={peeled ? 0.2 : 0.55} />
              <path d={smooth(r.map(([x, y]): Pt => [x - 0.4, y - 0.4]), false)} stroke={WHITE} strokeWidth={0.4} opacity={peeled ? 0.1 : 0.18} />
            </g>
          ))}
        </g>
        {!peeled && (
          <g fill={mix(body, SHADE, shape === "potato" ? 0.45 : 0.3)} opacity={0.6}>
            {g.specks.map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx={shape === "potato" ? 0.45 : 0.6} ry={shape === "potato" ? 0.35 : 0.2} />
            ))}
          </g>
        )}
        {g.eyes.map((e, i) => (
          <g key={`e${i}`} transform={`rotate(${e.deg} ${e.at[0]} ${e.at[1]})`}>
            {/** An eye: a shallow dent, darker on its far side, with the bud a dark dot in it. */}
            <path d={`M${e.at[0] - e.r} ${e.at[1]}Q${e.at[0]} ${e.at[1] + e.r * 0.9} ${e.at[0] + e.r} ${e.at[1]}`} fill="none" stroke={mix(body, SHADE, 0.55)} strokeWidth={0.6} strokeLinecap="round" />
            <path d={`M${e.at[0] - e.r * 0.8} ${e.at[1] - 0.5}Q${e.at[0]} ${e.at[1] - e.r * 0.5} ${e.at[0] + e.r * 0.8} ${e.at[1] - 0.5}`} fill="none" stroke={WHITE} strokeWidth={0.45} opacity={0.4} strokeLinecap="round" />
            <circle cx={e.at[0]} cy={e.at[1] + e.r * 0.25} r={Math.max(0.35, e.r * 0.2)} fill={mix(body, SHADE, peeled ? 0.4 : 0.7)} />
          </g>
        ))}
        {look && (
          <>
            <rect x={b.l - 2} y={b.t - 2} width={b.w + 4} height={b.h + 4} filter={`url(#${u("brown")})`} opacity={0.3 + look.browning * 0.6} />
            <path d={d} fill="none" stroke={look.crust} strokeWidth={2.6} opacity={0.15 + look.browning * 0.5} filter={`url(#${u("brownEdge")})`} />
          </>
        )}
      </g>
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE} strokeLinejoin="round" />
      {g.crown && (
        <g transform={`rotate(${g.crown.deg} ${g.crown.at[0]} ${g.crown.at[1]})`}>
          {/** The crown: where the leaves were cut away, a pale disc with the stem scars at its middle. */}
          <ellipse cx={g.crown.at[0] + g.crown.rx * 0.9} cy={g.crown.at[1]} rx={g.crown.rx * 0.45} ry={g.crown.ry * 0.5} fill={mix(LEAF, SHADE, 0.35)} opacity={0.8} />
        </g>
      )}
    </Art>
  );
}

function CutRoot({
  color = SKIN.carrot,
  flesh,
  core,
  shoulder,
  shape,
  tops: _tops,
  peeled = false,
  seed = 1,
  cut,
  layout,
  look,
  ...art
}: Inner & { cut: Exclude<Cut, "whole">; layout: Layout }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal: RootPalette = palette(shape, color, flesh, core, shoulder, look);
  const { result, pieces: shown, fit, k } = frameRoot(shape, cut, seed, peeled, layout, !!look);
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const heap = result.heap && layout === "pile";
  /** Cooked sides and edges brown with the face rather than outrunning it, or matchsticks read as burnt. */
  const edge = look ? outline(mix(pal.flesh, look.crust, 0.35 + look.browning * 0.3), 0.5) : outline(pal.flesh, 0.5);
  const sideFlesh = look ? mix(pal.flesh, look.crust, 0.12 + look.browning * 0.25) : mix(pal.flesh, SHADE, 0.22);
  const skinEdge = mix(pal.skin, SHADE, 0.3);
  /** Potato flesh is starchy and matte; carrot and daikon are wet and catch the light. */
  const wet = shape === "potato" ? 0.55 : 0.85;
  const edgeOf = (p: RootPiece) => {
    const bb = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.sqrt(bb.w * bb.h) / 14);
  };

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.4 / k} />
        </filter>
        <filter id={u("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={0.6 / k} />
        </filter>
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={1.2 / k} numOctaves={2} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(pal.flesh, SHADE, 0.3), 1, -0.6)} />
        </filter>
        {[
          ["face", pal.flesh],
          ["heart", pal.core],
        ].map(([name, c]) => (
          <radialGradient key={name} id={u(name!)} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor={lighten(c!, look ? 0.15 : 0.3)} />
            <stop offset="0.6" stopColor={c} />
            <stop offset="1" stopColor={mix(c!, SHADE, 0.12)} />
          </radialGradient>
        ))}
        <radialGradient id={u("wet")} cx="0.3" cy="0.28" r="0.42">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.7} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} grain={0.18} />}
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        {order.map((p, i) => {
          const d = polyPath(p.outer);
          const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
          const layers = Math.max(1, Math.round(p.thick * k));
          const bb = bbox(p.outer);
          const coreLine = shape !== "carrot";
          return (
            <g key={i}>
              {!heap && <path d={down(p.thick + (result.heap ? 1 : 2.5))} transform="translate(2 0)" fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={down(dy)} fill={p.skinSide ? mix(pal.skin, SHADE, 0.1 + 0.15 * (dy / p.thick)) : p.heart ? mix(pal.core, SHADE, 0.2) : sideFlesh} />
              ))}
              <path d={down(p.thick)} fill="none" stroke={p.skinSide ? mix(pal.skin, SHADE, 0.55) : edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <path d={d} fill={`url(#${u(p.heart ? "heart" : "face")})`} />
              {!result.heap && (
                <>
                  <clipPath id={u(`c${i}`)}>
                    <path d={d} />
                  </clipPath>
                  <rect x={bb.l} y={bb.t} width={bb.w} height={bb.h} clipPath={`url(#${u(`c${i}`)})`} filter={`url(#${u("grain")})`} opacity={shape === "potato" ? 0.8 : 0.5} />
                </>
              )}
              {p.core &&
                (coreLine ? (
                  <path d={polyPath(p.core)} fill="none" stroke={pal.core} strokeWidth={0.5} opacity={0.75} filter={`url(#${u("soft")})`} />
                ) : (
                  <>
                    <path d={polyPath(p.core)} fill={pal.core} opacity={0.85} filter={`url(#${u("soft")})`} />
                    <path d={polyPath(p.core)} fill="none" stroke={mix(pal.flesh, SHADE, 0.12)} strokeWidth={0.35} opacity={0.5} />
                  </>
                ))}
              {p.cap && (
                <>
                  <path d={polyPath(p.cap.outer)} fill={`url(#${u("face")})`} stroke={edge} strokeWidth={edgeOf(p) * 0.7} />
                  <path d={polyPath(p.cap.core)} fill={pal.core} opacity={0.85} filter={`url(#${u("soft")})`} />
                </>
              )}
              {look && (
                /** A browned edge as wide as a matchstick would cover all of it, so thin pieces brown less. */
                <g opacity={(0.2 + look.browning * 0.75) * Math.min(1, Math.min(bb.w, bb.h) / 6)}>
                  <Browned clip={u(`b${i}`)} d={d} box={bb} crust={look.crust} browning={look.browning} u={u} edge={result.heap ? 0.6 : 2} />
                </g>
              )}
              <path d={d} fill={`url(#${u("wet")})`} opacity={look ? (shape === "carrot" ? 0.55 : 0.25) * (1 - look.browning * 0.7) : wet} />
              {p.rim && <path d={d} fill="none" stroke={skinEdge} strokeWidth={shape === "potato" ? 1.1 : 0.9} strokeLinejoin="round" />}
              {p.skinEdge && !peeled && <path d={smooth(p.skinEdge, false)} fill="none" stroke={pal.skin} strokeWidth={shape === "potato" ? 1.6 : 1.1} strokeLinecap="round" />}
              <path d={d} fill="none" stroke={p.rim || (p.skinEdge && !peeled) ? mix(pal.skin, SHADE, 0.55) : edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}
