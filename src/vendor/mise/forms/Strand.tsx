import { useId } from "react";
import { snap } from "../core/frame";
import { Art, EDGE } from "../core/Art";
import { lighten, mix, outline, SHADE, WHITE } from "../core/color";
import { bbox } from "../core/geometry";
import { smooth } from "../core/rough";
import { frameStrand } from "./strand-cuts";
import { strandPalette, type StrandPalette } from "./strand-look";
import { COLOR, strandGeometry, type StrandPart, type StrandProps } from "./strand-shape";

/** Noodles and pasta: a dry bundle or nest, a cooked glossy tangle, or broken, cut short or chopped. */
export function Strand({ shape = "spaghetti", color, cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.2, seed = 1, ...art }: StrandProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = strandPalette(shape, color ?? COLOR[shape], cooked, cookedColor, browning);

  if (cut === "whole") {
    const parts = snap(strandGeometry(shape, seed, cooked));
    const b = bbox(parts.flatMap((p) => p.outer));
    return (
      <Art {...art}>
        <defs>
          <Defs u={u} />
        </defs>
        <ellipse cx={(b.l + b.r) / 2 + 2} cy={b.b - 2} rx={b.w * 0.44} ry={cooked ? 6 : 4} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />
        <Strands parts={parts} pal={pal} u={u} k={1} cooked={cooked} />
      </Art>
    );
  }

  const { result, pieces, fit, k } = frameStrand(shape, cut, seed, layout, cooked);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...art}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />}
        <Strands parts={pieces} pal={pal} u={u} k={k} cooked={cooked} />
      </g>
    </Art>
  );
}

function Defs({ u, k = 1 }: { u: (n: string) => string; k?: number }) {
  return (
    <>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.2 / k} />
      </filter>
    </>
  );
}

/** Every strand: an edge, its body, and a bright line of gloss along it; charred patches where the wok caught it. */
function Strands({ parts, pal, u, k, cooked }: { parts: StrandPart[]; pal: StrandPalette; u: (n: string) => string; k: number; cooked: boolean }) {
  /** A dense dry bundle would turn to a dark mass of outlines, so its strands get a lighter edge. */
  const edge = outline(pal.body, cooked ? 0.5 : 0.35);
  return (
    <>
      {parts.map((p, i) => {
        const tone = p.tone > 0 ? mix(pal.body, lighten(pal.body, 0.5), p.tone * 0.5) : mix(pal.body, mix(pal.body, SHADE, 0.45), -p.tone * 0.5);
        const d = smooth(p.line, false);
        const charred = pal.browning > 0.15 && i % 2 === 0;
        const n = p.line.length;
        const patch = charred && n > 3 ? smooth(p.line.slice(Math.floor(n * 0.25), Math.max(Math.floor(n * 0.25) + 2, Math.floor(n * 0.6))), false) : null;
        const e = (EDGE * 0.55) / k;
        if (p.ribbon) {
          const r = smooth(p.ribbon, true);
          return (
            <g key={i}>
              <path d={r} fill={tone} />
              {patch && <path d={patch} fill="none" stroke={pal.char} strokeWidth={p.width * 0.6} strokeLinecap="round" opacity={Math.min(0.9, pal.browning * 1.1)} />}
              <path d={d} fill="none" stroke={WHITE} strokeWidth={p.width * 0.18} strokeLinecap="round" opacity={cooked ? 0.55 : 0.3} />
              <path d={r} fill="none" stroke={edge} strokeWidth={e} strokeLinejoin="round" />
            </g>
          );
        }
        return (
          <g key={i}>
            {p.root && <path d={smooth(p.root, false)} fill="none" stroke={mix(pal.body, SHADE, 0.3)} strokeWidth={p.width * 0.3} strokeLinecap="round" />}
            <path d={d} fill="none" stroke={edge} strokeWidth={p.width + e * 2} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={tone} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" />
            {patch && <path d={patch} fill="none" stroke={pal.char} strokeWidth={p.width * 0.9} strokeLinecap="round" opacity={Math.min(0.95, pal.browning * 1.2)} />}
            <path d={d} fill="none" stroke={WHITE} strokeWidth={p.width * 0.3} strokeLinecap="round" opacity={cooked ? 0.6 : 0.35} transform={`translate(${-p.width * 0.18} ${-p.width * 0.18})`} />
            {/* A bean sprout's seed head: pale yellow, a little wider than the stem. */}
            {p.head && <ellipse cx={p.head[0]} cy={p.head[1]} rx={p.width * 0.95} ry={p.width * 0.72} fill={cooked ? "#d9cf7a" : "#e9dc6e"} stroke={outline("#e9dc6e", 0.5)} strokeWidth={e} />}
          </g>
        );
      })}
    </>
  );
}
