import { useId } from "react";
import { snap } from "../core/frame";
import { Art, EDGE } from "../core/Art";
import { lighten, mix, outline, SHADE, WHITE } from "../core/color";
import { bbox, polyPath } from "../core/geometry";
import { smooth, type Pt } from "../core/rough";
import { frameCurl } from "./curl-cuts";
import { curlPalette, type CurlPalette } from "./curl-look";
import { curlGeometry, SHELL, type CurlPart, type CurlProps } from "./curl-shape";

/** A shrimp or prawn, curled, shell on or peeled, whole or cut, raw grey or cooked pink. */
export function Curl({ color = SHELL, shape = "shrimp", peeled = false, tail = true, cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.25, seed = 1, ...art }: CurlProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  /** Cut shrimp are always peeled first. */
  const pal = curlPalette(color, peeled || cut !== "whole", cooked, cookedColor, browning);

  if (cut === "whole") {
    const parts = snap(curlGeometry(shape, seed, { peeled, tail, cooked }));
    const b = bbox(parts.filter((p) => p.kind === "body" || p.kind === "head").flatMap((p) => p.outer));
    return (
      <Art {...art}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} />
        </defs>
        <ellipse cx={(b.l + b.r) / 2 + 2} cy={b.b - 1} rx={b.w * 0.42} ry={4} fill={SHADE} opacity={0.22} filter={`url(#${u("shadow")})`} />
        <Parts parts={parts} u={u} pal={pal} k={1} cooked={cooked} shell={!peeled} />
      </Art>
    );
  }

  const { result, pieces, fit, k } = frameCurl(shape, cut, seed, layout, cooked);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...art}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        <Parts parts={pieces} u={u} pal={pal} k={k} cooked={cooked} shell={false} shadows={!heap} />
      </g>
    </Art>
  );
}

type Ids = (n: string) => string;

function Defs({ u, pal, seed, k = 1 }: { u: Ids; pal: CurlPalette; seed: number; k?: number }) {
  return (
    <>
      <linearGradient id={u("sheen")} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.45} />
        <stop offset="0.5" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.2} />
      </linearGradient>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.2 / k} />
      </filter>
      <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={1.1 / k} />
      </filter>
    </>
  );
}

function Parts({ parts, u, pal, k, cooked, shell, shadows = false }: { parts: CurlPart[]; u: Ids; pal: CurlPalette; k: number; cooked: boolean; shell: boolean; shadows?: boolean }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "leg" || p.kind === "feeler") {
          if (p.outer.length === 1) return <circle key={i} cx={p.outer[0]![0]} cy={p.outer[0]![1]} r={(p.width ?? 3) / 2} fill="#1f1a1c" />;
          const d = smooth(p.outer, false);
          const c = p.kind === "feeler" ? mix(pal.tail, SHADE, 0.2) : mix(pal.body, SHADE, 0.3);
          return <path key={i} d={d} fill="none" stroke={c} strokeWidth={p.width ?? 1} strokeLinecap="round" />;
        }
        const d = polyPath(p.outer);
        const box = bbox(p.outer);
        const size = Math.sqrt(box.w * box.h);
        const edgeW = ((EDGE * 0.7) / k) * Math.min(1, size / 6) + 0.15 / k;
        const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
        const layers = p.thick * k > 1 ? Math.min(8, Math.round(p.thick * k)) : 0;
        const fill = p.kind === "tail" ? pal.tail : p.kind === "bit" ? (p.red ? mix(pal.flesh, pal.stripe, 0.6) : pal.flesh) : p.kind === "paste" ? mix(pal.flesh, pal.stripe, cooked ? 0.25 : 0.15) : pal.body;
        const shadow = shadows && p.kind !== "tail" && <path d={down(p.thick + 1.5)} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />;
        return (
          <g key={i}>
            {shadow}
            {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
              <path key={dy} d={down(dy)} fill={mix(fill, SHADE, 0.18)} />
            ))}
            <path d={p.kind === "paste" ? smooth(p.outer, true) : d} fill={fill} />
            <clipPath id={u(`c${i}`)}>
              <path d={d} />
            </clipPath>
            {p.band && (
              /** The back of each segment carries the colour: grey raw, a strong orange-red cooked, fading toward the belly. */
              <>
                <g clipPath={`url(#${u(`c${i}`)})`}>
                  <path d={polyPath(p.band)} fill={pal.stripe} opacity={cooked ? 0.9 : 0.55} filter={`url(#${u("soft")})`} />
                </g>
              </>
            )}
            {p.segs?.map((s, j) => (
              <path key={j} d={smooth(s, false)} fill="none" stroke={cooked ? lighten(pal.body, 0.55) : mix(pal.body, SHADE, 0.3)} strokeWidth={(cooked ? 1.3 : 0.9) / Math.max(1, k * 0.5)} strokeLinecap="round" opacity={0.85} />
            ))}
            {p.vein && <path d={smooth(p.vein, false)} fill="none" stroke={shell && !cooked ? pal.vein : mix(pal.stripe, SHADE, 0.2)} strokeWidth={(shell && !cooked ? 1.1 : 0.8) / Math.max(1, k * 0.5)} strokeLinecap="round" opacity={shell && !cooked ? 0.6 : 0.5} />}
            {p.faces?.map((f, j) => (
              <path key={`f${j}`} d={smooth(f, false)} fill="none" stroke={pal.flesh} strokeWidth={2.2 / Math.max(1, k * 0.4)} strokeLinecap="round" />
            ))}
            {p.kind === "paste" && <path d={smooth(p.outer, true)} fill={`url(#${u("sheen")})`} />}
            {p.kind !== "paste" && <path d={d} fill={`url(#${u("sheen")})`} />}
            {/* Searing caramelises the curve of the back first, deepening toward black past 0.8, rather than speckling. */}
            {cooked && pal.browning > 0.15 && (
              <g clipPath={`url(#${u(`c${i}`)})`}>
                <path d={polyPath(p.band ?? p.outer)} fill={pal.crust} opacity={Math.min(0.85, pal.browning * 0.75)} filter={`url(#${u("soft")})`} />
              </g>
            )}
            {/* Raw shrimp are glassy: a bright line catches along the back. */}
            {!cooked && p.kind === "body" && p.vein && <path d={smooth(p.vein, false)} fill="none" stroke={WHITE} strokeWidth={0.8 / Math.max(1, k * 0.5)} opacity={0.35} transform="translate(-0.8 -0.8)" />}
            <path d={p.kind === "paste" ? smooth(p.outer, true) : d} fill="none" stroke={outline(mix(fill, SHADE, 0.2), 0.45)} strokeWidth={edgeW} strokeLinejoin="round" />
          </g>
        );
      })}
    </>
  );
}
