import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, WHITE } from "../core/color";
import { area, bbox, polyPath } from "../core/geometry";
import { smooth, type Pt } from "../core/rough";
import { frameLeaf, wilt } from "./leaf-cuts";
import { leafLook, palette, type LeafLook, type LeafPalette } from "./leaf-look";
import { leafGeometry, type LeafPart, type LeafProps, type LeafShape } from "./leaf-shape";

/**
 * Leafy food: a bunch of cilantro, a sprig of basil, a bunch of spinach, a head of bok choy or a cabbage, whole or cut,
 * raw or wilted by heat.
 */
export function Leaf({ shape = "cilantro", cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.2, color, rib, heart, seed = 1, ...rest }: LeafProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const look = cooked ? leafLook(shape, color, rib, cookedColor, browning) : null;
  const pal = palette(shape, color, rib, heart, look);

  if (cut === "whole") {
    const raw = leafGeometry(shape, seed);
    const parts = look ? wilt(shape, raw, seed) : raw;
    const b = bbox(parts.flatMap((p) => p.outer));
    return (
      <Art {...rest}>
        <defs>
          <Defs u={u} look={look} seed={seed} />
        </defs>
        <ellipse cx={(b.l + b.r) / 2 + 2} cy={b.b - 2} rx={b.w * 0.42} ry={4} fill={SHADE} opacity={0.22} filter={`url(#${u("shadow")})`} />
        <Parts parts={parts} u={u} pal={pal} look={look} shape={shape} k={1} />
      </Art>
    );
  }

  const { result, pieces, fit, k } = frameLeaf(shape, cut, seed, layout, cooked);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...rest}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} look={look} seed={seed} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        <Parts parts={pieces} u={u} pal={pal} look={look} shape={shape} k={k} shadows={!heap && pieces.length < 40} />
      </g>
    </Art>
  );
}

function Defs({ u, look, seed, k = 1 }: { u: (n: string) => string; look: LeafLook | null; seed: number; k?: number }) {
  return (
    <>
      {/* One sheen for every leaf: light catching the upper edge, shade toward the lower. */}
      <linearGradient id={u("sheen")} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.3} />
        <stop offset="0.5" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.22} />
      </linearGradient>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.4 / k} />
      </filter>
      {look && <BrownDefs u={u} crust={look.crust} browning={look.browning * 0.7} k={k} seed={seed} grain={0.14} />}
    </>
  );
}

const centre = (pts: Pt[]) => bbox(pts);
const perimeter = (pts: Pt[]) => pts.reduce((s, q, i) => s + Math.hypot(q[0] - pts[(i + 1) % pts.length]![0], q[1] - pts[(i + 1) % pts.length]![1]), 0);

function Parts({ parts, u, pal, look, shape, k, shadows = false }: { parts: LeafPart[]; u: (n: string) => string; pal: LeafPalette; look: LeafLook | null; shape: LeafShape; k: number; shadows?: boolean }) {
  const stemColor = mix(pal.rib, pal.leaf, shape === "bokchoy" || shape === "cabbage" ? 0.3 : 0.15);
  const stemEdge = outline(stemColor, 0.5);
  const many = parts.length > 60;
  /** Only bok choy and cabbage sear; herbs and spinach wilt long before they would brown. */
  const heads = shape === "bokchoy" || shape === "cabbage";
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "stem") {
          const d = smooth(p.outer, false);
          const w = p.width ?? 1;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={stemEdge} strokeWidth={w + (EDGE * 0.8) / k} strokeLinecap="round" strokeLinejoin="round" />
              <path d={d} fill="none" stroke={stemColor} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        }
        const d = polyPath(p.outer);
        const box = centre(p.outer);
        /** How wide the piece is across, not how big its box is, so a thin ribbon gets a thin edge. */
        const size = Math.min(Math.sqrt(box.w * box.h), (4 * Math.abs(area(p.outer))) / Math.max(1, perimeter(p.outer)));
        const edgeW = ((EDGE * 0.6) / k) * Math.min(1, size / 6) + 0.15 / k;
        const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
        /** A leaf is paper-thin, so only a stalk or a cut head shows a side. */
        const layers = p.thick >= 1 && p.thick * k > 1 ? Math.min(8, Math.round(p.thick * k)) : 0;
        const shadow = shadows && <path d={down(p.thick + 1.5)} fill={SHADE} opacity={0.16} filter={`url(#${u("shadow")})`} />;

        if (p.kind === "face") {
          const side = shape === "cabbage" ? mix(pal.leaf, SHADE, 0.15) : mix(pal.rib, SHADE, 0.15);
          const lineColor = shape === "cabbage" ? mix(pal.leaf, pal.heart, 0.35) : mix(pal.rib, SHADE, 0.22);
          return (
            <g key={i}>
              {shadow}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={down(dy)} fill={side} />
              ))}
              <path d={down(p.thick)} fill="none" stroke={outline(side, 0.4)} strokeWidth={edgeW} strokeLinejoin="round" />
              <path d={d} fill={pal.heart} />
              {p.green && (
                <>
                  <path d={smooth(p.green, true)} fill={pal.leaf} />
                  <path d={smooth(p.green, true)} fill={`url(#${u("sheen")})`} />
                  <path d={smooth(p.green, true)} fill="none" stroke={outline(pal.dark, 0.4)} strokeWidth={edgeW} strokeLinejoin="round" />
                </>
              )}
              {p.layers?.map((l, j) => (
                <path key={j} d={smooth(l, false)} fill="none" stroke={lineColor} strokeWidth={(j % 2 ? 1 : 1.4) / Math.max(1, k * 0.6)} strokeLinecap="round" opacity={0.85} />
              ))}
              {p.core && <path d={smooth(p.core, true)} fill={lighten(pal.heart, 0.35)} stroke={mix(pal.heart, SHADE, 0.2)} strokeWidth={0.5 / k} />}
              {shape === "cabbage" && <path d={d} fill="none" stroke={pal.leaf} strokeWidth={2.6 / Math.max(1, k * 0.5)} strokeLinejoin="round" />}
              {look && look.browning > 0.15 && <Browned clip={u(`b${i}`)} d={d} box={box} crust={look.crust} browning={look.browning * 0.7} u={u} />}
              <path d={d} fill="none" stroke={outline(shape === "cabbage" ? pal.dark : pal.rib, 0.5)} strokeWidth={edgeW} strokeLinejoin="round" />
            </g>
          );
        }

        const pale = p.pale ?? 0;
        const base = mix(pal.leaf, pal.rib, pale);
        const fill = p.tone > 0 ? mix(base, lighten(base, 0.4), p.tone * 0.6) : mix(base, mix(base, SHADE, 0.5), -p.tone * 0.6);
        const veinColor = pale > 0.5 ? mix(pal.rib, SHADE, 0.14) : shape === "bokchoy" || shape === "cabbage" ? lighten(pal.rib, 0.1) : lighten(fill, 0.32);
        const [mid, ...veins] = p.veins ?? [];
        return (
          <g key={i}>
            {shadow}
            {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
              <path key={dy} d={down(dy)} fill={mix(fill, SHADE, 0.18)} />
            ))}
            <path d={d} fill={fill} />
            {!many && <path d={d} fill={`url(#${u("sheen")})`} />}
            {p.layers?.map((l, j) => (
              <path key={`m${j}`} d={smooth(l, false)} fill="none" stroke={mix(fill, SHADE, 0.3)} strokeWidth={1.1} strokeLinecap="round" opacity={0.7} />
            ))}
            {veins.map((v, j) => (
              <path key={j} d={smooth(v, false)} fill="none" stroke={veinColor} strokeWidth={(pale > 0.5 ? 0.7 : shape === "cabbage" && p.width == null ? 2 : 0.7) / k} strokeLinecap="round" opacity={0.8} />
            ))}
            {mid && <path d={smooth(mid, false)} fill="none" stroke={veinColor} strokeWidth={p.width ?? 0.9 / k} strokeLinecap="round" opacity={0.9} />}
            {look && heads && look.browning > 0.4 && size > 12 && parts.length < 30 && <Browned clip={u(`b${i}`)} d={d} box={box} crust={look.crust} browning={look.browning * 0.6} u={u} edge={1.6} />}
            {look && !many && <path d={d} fill="none" stroke={WHITE} strokeWidth={0.5 / k} opacity={0.35} />}
            <path d={d} fill="none" stroke={outline(mix(fill, SHADE, 0.3), 0.45)} strokeWidth={edgeW} strokeLinejoin="round" />
          </g>
        );
      })}
    </>
  );
}
