import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, WHITE } from "../core/color";
import { bbox, polyPath } from "../core/geometry";
import { smooth, type Pt } from "../core/rough";
import { frameCap, type CapPiece } from "./cap-cuts";
import { capPalette, type CapPalette } from "./cap-look";
import { capGeometry, type CapProps } from "./cap-shape";

/** A mushroom: button, shiitake or a cluster of oyster mushrooms, whole or cut through to its gills, raw or seared. */
export function Cap({ color, flesh, shape = "button", cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.35, seed = 1, ...art }: CapProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = capPalette(shape, color, flesh, cooked, cookedColor, browning);

  if (cut === "whole") {
    const g = capGeometry(shape, seed);
    const all = [...g.caps.flatMap((c) => [...c.cap, ...c.stem]), ...g.fans.flatMap((f) => f.outline)];
    const b = bbox(all);
    return (
      <Art {...art}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} />
        </defs>
        <ellipse cx={(b.l + b.r) / 2 + 2} cy={b.b - 1} rx={b.w * 0.4} ry={4} fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />
        {g.fans.map((f, i) => (
          <Fan key={i} outline={f.outline} gills={f.gills} pal={pal} u={u} k={1} i={i} />
        ))}
        {g.caps.map((c, i) => {
          const cd = smooth(c.cap, true);
          const sd = smooth(c.stem, true);
          return (
            <g key={i}>
              <path d={sd} fill={pal.flesh} />
              <path d={sd} fill={`url(#${u("side")})`} />
              <path d={sd} fill="none" stroke={outline(pal.flesh, 0.45)} strokeWidth={EDGE} strokeLinejoin="round" />
              {/* The gills, glimpsed under the rim. */}
              <path d={smooth(c.gills, false) + "Z"} fill={pal.gill} stroke={outline(pal.gill, 0.4)} strokeWidth={EDGE * 0.6} />
              <path d={cd} fill={pal.cap} />
              <path d={cd} fill={`url(#${u("dome")})`} />
              {c.cracks.map((k, j) => (
                <path key={j} d={smooth(k, false)} fill="none" stroke={lighten(pal.cap, 0.55)} strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
              ))}
              {pal.browning > 0.3 && <Browned clip={u(`w${i}`)} d={cd} box={bbox(c.cap)} crust={pal.crust} browning={pal.browning * 0.6} u={u} />}
              <path d={cd} fill="none" stroke={outline(pal.cap, 0.45)} strokeWidth={EDGE} strokeLinejoin="round" />
            </g>
          );
        })}
      </Art>
    );
  }

  const { result, pieces, fit, k } = frameCap(shape, cut, seed, layout, cooked);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...art}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        {pieces.map((p, i) => (
          <Piece key={i} p={p} i={i} pal={pal} u={u} k={k} shadow={!heap} />
        ))}
      </g>
    </Art>
  );
}

type Ids = (n: string) => string;

function Defs({ u, pal, seed, k = 1 }: { u: Ids; pal: CapPalette; seed: number; k?: number }) {
  return (
    <>
      <radialGradient id={u("dome")} cx="0.38" cy="0.25" r="0.8">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.35} />
        <stop offset="0.5" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.3} />
      </radialGradient>
      <linearGradient id={u("side")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.25} />
        <stop offset="0.6" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.25} />
      </linearGradient>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.2 / k} />
      </filter>
      {pal.browning > 0 && <BrownDefs u={u} crust={pal.crust} browning={pal.browning} k={k} seed={seed} grain={0.18} />}
    </>
  );
}

/** An oyster mushroom's fan: a soft grey shell with its gills running back to the stub. */
function Fan({ outline: o, gills, pal, u, k, i }: { outline: Pt[]; gills: Pt[][]; pal: CapPalette; u: Ids; k: number; i: number }) {
  const d = smooth(o, true);
  return (
    <g>
      <path d={d} fill={i % 2 ? pal.cap : lighten(pal.cap, 0.08)} />
      {gills.map((g, j) => (
        <path key={j} d={smooth(g, false)} fill="none" stroke={mix(pal.cap, SHADE, 0.15)} strokeWidth={0.6 / k} strokeLinecap="round" opacity={0.45} />
      ))}
      <path d={d} fill={`url(#${u("dome")})`} />
      {pal.browning > 0.3 && <Browned clip={u(`f${i}`)} d={d} box={bbox(o)} crust={pal.crust} browning={pal.browning * 0.6} u={u} edge={1.6} />}
      <path d={d} fill="none" stroke={outline(pal.cap, 0.45)} strokeWidth={(EDGE * 0.8) / k} strokeLinejoin="round" />
    </g>
  );
}

function Piece({ p, i, pal, u, k, shadow }: { p: CapPiece; i: number; pal: CapPalette; u: Ids; k: number; shadow: boolean }) {
  if (p.kind === "fan") return <Fan outline={p.outer} gills={p.lines ?? []} pal={pal} u={u} k={k} i={i} />;
  const d = polyPath(p.outer);
  const box = bbox(p.outer);
  const size = Math.sqrt(box.w * box.h);
  const edgeW = ((EDGE * 0.7) / k) * Math.min(1, size / 6) + 0.15 / k;
  const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
  const layers = p.thick * k > 1 ? Math.min(8, Math.round(p.thick * k)) : 0;
  const face = p.kind === "bit" && p.skin ? pal.cap : pal.flesh;
  return (
    <g>
      {shadow && <path d={down(p.thick + 1.5)} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />}
      {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
        <path key={dy} d={down(dy)} fill={mix(face, SHADE, 0.18)} />
      ))}
      <path d={d} fill={face} />
      {p.gills && <path d={polyPath(p.gills)} fill={pal.gill} opacity={0.9} />}
      {pal.browning > 0.15 && size > 3 && <Browned clip={u(`b${i}`)} d={d} box={box} crust={pal.crust} browning={pal.browning * 0.7} u={u} edge={1.4} />}
      {/* The cap's skin shows as a brown line along the top of every cut face. */}
      {p.top && <path d={smooth(p.top, false)} fill="none" stroke={pal.cap} strokeWidth={Math.max(1.2, size * 0.09) / Math.max(1, k * 0.35)} strokeLinecap="round" />}
      <path d={d} fill="none" stroke={outline(mix(face, SHADE, 0.25), 0.45)} strokeWidth={edgeW} strokeLinejoin="round" />
    </g>
  );
}
