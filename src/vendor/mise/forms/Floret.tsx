import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import type { Cut, Layout } from "../core/cut";
import { bbox, polyPath } from "../core/geometry";
import { smooth, type Pt } from "../core/rough";
import { frameFloret, type FloretPiece } from "./floret-cuts";
import { floretLook, palette, type FloretLook, type FloretPalette } from "./floret-look";
import { floretGeometry, type FloretProps, type FloretShape } from "./floret-shape";

/**
 * Broccoli or cauliflower lying on its side: a dome of knobbly bud clusters on a thick, branching stalk, the cauliflower
 * cupped in its leaves. Every lobe is shaded on its own and grained with tiny buds.
 */
export function Floret({ cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.35, ...props }: FloretProps) {
  const shape = props.shape ?? "broccoli";
  const look = cooked ? floretLook(shape, props.color, cookedColor, browning) : null;
  if (cut !== "whole") return <CutFloret {...props} shape={shape} cut={cut} layout={layout} look={look} />;
  return <WholeFloret {...props} shape={shape} look={look} />;
}

type Inner = Omit<FloretProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { shape: FloretShape; look: FloretLook | null };

/** Gradients and filters every floret drawing shares: one lobe shading, bud grain, and browning. */
function Defs({ u, pal, look, seed, k = 1, shape }: { u: (n: string) => string; pal: FloretPalette; look: FloretLook | null; seed: number; k?: number; shape: FloretShape }) {
  return (
    <>
      <radialGradient id={u("lobe")} cx="0.36" cy="0.32" r="0.75">
        <stop offset="0" stopColor={pal.budLight} />
        <stop offset="0.55" stopColor={pal.buds} />
        <stop offset="1" stopColor={pal.budDark} />
      </radialGradient>
      <filter id={u("buds")} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={(shape === "broccoli" ? 1.5 : 0.9) / k} numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values={tint(pal.budDark, shape === "broccoli" ? 2.2 : 1.6, shape === "broccoli" ? -0.95 : -0.75)} />
      </filter>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.6 / k} />
      </filter>
      <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={0.5 / k} />
      </filter>
      <linearGradient id={u("stem")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={lighten(pal.stem, 0.25)} />
        <stop offset="1" stopColor={mix(pal.stem, SHADE, 0.2)} />
      </linearGradient>
      {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} grain={0.35} />}
    </>
  );
}

/** Bud clusters: each lobe shaded round, grained with buds, and browned at its tips once roasted. */
function Lobes({ lobes, u, clip, pal, look, k = 1 }: { lobes: Pt[][]; u: (n: string) => string; clip: string; pal: FloretPalette; look: FloretLook | null; k?: number }) {
  const b = bbox(lobes.flat());
  const edge = outline(pal.budDark, 0.55);
  return (
    <>
      <clipPath id={clip}>
        {lobes.map((l, i) => (
          <path key={i} d={smooth(l, true)} />
        ))}
      </clipPath>
      {lobes.map((l, i) => (
        <g key={i}>
          <path d={smooth(l, true)} fill={`url(#${u("lobe")})`} />
          <path d={smooth(l, true)} fill="none" stroke={edge} strokeWidth={(EDGE * 0.55) / k} strokeLinejoin="round" />
        </g>
      ))}
      <g clipPath={`url(#${clip})`}>
        <rect x={b.l} y={b.t} width={b.w} height={b.h} filter={`url(#${u("buds")})`} opacity={0.85} />
        {look && look.browning > 0.15 && (
          /** Roasting catches the tops of the lobes first, so the browning sits high and patchy. */
          <rect x={b.l} y={b.t} width={b.w} height={b.h * 0.7} filter={`url(#${u("brown")})`} opacity={Math.min(1, (look.browning - 0.1) * 1.4)} />
        )}
      </g>
    </>
  );
}

function WholeFloret({ color, stem, leaf, shape, seed = 1, look, ...art }: Inner) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = floretGeometry(shape, seed);
  const pal = palette(shape, color, stem, leaf, look);
  const stalk = smooth(g.stalk, true);
  const leafEdge = outline(pal.leaf, 0.55);
  const drawLeaf = (l: { outline: Pt[]; rib: Pt[] }, i: number, key: string) => (
    <g key={`${key}${i}`}>
      <path d={smooth(l.outline, true)} fill={i % 2 ? pal.leaf : lighten(pal.leaf, 0.1)} />
      <path d={smooth(l.rib, false)} fill="none" stroke={lighten(pal.leaf, 0.55)} strokeWidth={1.4} strokeLinecap="round" />
      <path d={smooth(l.outline, true)} fill="none" stroke={leafEdge} strokeWidth={EDGE * 0.8} strokeLinejoin="round" />
    </g>
  );

  return (
    <Art {...art}>
      <defs>
        <Defs u={u} pal={pal} look={look} seed={seed} shape={shape} />
      </defs>
      <ellipse cx={(g.box.l + g.box.r) / 2 + 2} cy={g.bottom + 1} rx={(g.box.r - g.box.l) * 0.42} ry={4.5} fill={SHADE} opacity={0.26} filter={`url(#${u("shadow")})`} />
      {g.leavesBack.map((l, i) => drawLeaf(l, i, "b"))}
      {/* A cauliflower's short stalk hides under its leaves. */}
      {shape === "broccoli" && (
        <>
          <path d={stalk} fill={`url(#${u("stem")})`} />
          <path d={stalk} fill="none" stroke={outline(pal.stem, 0.55)} strokeWidth={EDGE} strokeLinejoin="round" />
        </>
      )}
      <g fill="none" strokeLinecap="round">
        {g.branches.map((b, i) => (
          <g key={i}>
            <path d={smooth(b, false)} stroke={outline(pal.stem, 0.55)} strokeWidth={6.2} />
            <path d={smooth(b, false)} stroke={pal.stem} strokeWidth={4.6} />
          </g>
        ))}
      </g>
      <Lobes lobes={g.lobes.map((l) => l.outline)} u={u} clip={u("crown")} pal={pal} look={look} />
      {g.leavesFront.map((l, i) => drawLeaf(l, i, "f"))}
    </Art>
  );
}

function CutFloret({ color, stem, leaf, shape, seed = 1, cut, layout, look, ...art }: Inner & { cut: Exclude<Cut, "whole">; layout: Layout }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = palette(shape, color, stem, leaf, look);
  const { result, pieces, fit, k } = frameFloret(shape, cut, seed, layout, !!look);
  const heap = result.heap && layout === "pile";
  const edgeOf = (p: FloretPiece) => {
    const b = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.sqrt(b.w * b.h) / 14);
  };
  const fleshEdge = outline(pal.flesh, 0.5);

  return (
    <Art {...art}>
      <defs>
        <Defs u={u} pal={pal} look={look} seed={seed} k={k} shape={shape} />
        <radialGradient id={u("flesh")} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={lighten(pal.flesh, 0.35)} />
          <stop offset="1" stopColor={pal.flesh} />
        </radialGradient>
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        {pieces.map((p, i) => {
          const d = polyPath(p.outer);
          const shadow = !heap && <path d={polyPath(p.outer.map(([x, y]): Pt => [x + 2, y + p.thick + 2]))} fill={SHADE} opacity={0.22} filter={`url(#${u("shadow")})`} />;
          if (p.kind === "floret")
            return (
              <g key={i}>
                {shadow}
                {p.stem && (
                  <>
                    <path d={smooth(p.stem, true)} fill={`url(#${u("stem")})`} />
                    <path d={smooth(p.stem, true)} fill="none" stroke={outline(pal.stem, 0.5)} strokeWidth={edgeOf(p) * 0.7} strokeLinejoin="round" />
                  </>
                )}
                <Lobes lobes={p.lobes ?? []} u={u} clip={u(`c${i}`)} pal={pal} look={look} k={k} />
              </g>
            );
          if (p.kind === "crumb") return <path key={i} d={d} fill={i % 3 ? pal.buds : i % 2 ? pal.budLight : pal.flesh} stroke={pal.budDark} strokeWidth={0.25} />;
          const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
          const layers = Math.max(1, Math.round(p.thick * k));
          const side = p.kind === "stem" ? mix(pal.stem, SHADE, 0.15) : mix(pal.flesh, SHADE, 0.18);
          return (
            <g key={i}>
              {shadow}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={down(dy)} fill={side} />
              ))}
              <path d={down(p.thick)} fill="none" stroke={fleshEdge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <path d={d} fill={`url(#${u("flesh")})`} />
              {p.crown && (
                <>
                  <clipPath id={u(`f${i}`)}>
                    <path d={polyPath(p.crown)} />
                  </clipPath>
                  <path d={polyPath(p.crown)} fill={`url(#${u("lobe")})`} />
                  <g clipPath={`url(#${u(`f${i}`)})`}>
                    <rect x={bbox(p.crown).l} y={bbox(p.crown).t} width={bbox(p.crown).w} height={bbox(p.crown).h} filter={`url(#${u("buds")})`} />
                    {look && look.browning > 0.15 && (
                      <rect x={bbox(p.crown).l} y={bbox(p.crown).t} width={bbox(p.crown).w} height={bbox(p.crown).h} filter={`url(#${u("brown")})`} opacity={Math.min(1, look.browning * 1.3)} />
                    )}
                  </g>
                </>
              )}
              {p.veins?.map((v, j) => (
                <path key={j} d={smooth(v, false)} fill="none" stroke={mix(pal.stem, SHADE, 0.12)} strokeWidth={j % 2 ? 1.1 : 1.5} strokeLinecap="round" opacity={0.75} />
              ))}
              {p.core && <path d={polyPath(p.core)} fill={lighten(pal.flesh, 0.25)} stroke={mix(pal.stem, SHADE, 0.1)} strokeWidth={0.35} filter={`url(#${u("soft")})`} />}
              {p.kind === "stem" && <path d={d} fill={WHITE} opacity={look ? 0.1 : 0.25} />}
              <path d={d} fill="none" stroke={p.crown ? outline(pal.budDark, 0.55) : fleshEdge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}
