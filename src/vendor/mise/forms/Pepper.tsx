import { useId } from "react";
import { snap } from "../core/frame";
import { Art, EDGE } from "../core/Art";
import { lighten, mix, outline, SHADE, WHITE } from "../core/color";
import { bbox, polyPath, type Box } from "../core/geometry";
import { rng, smooth, type Pt } from "../core/rough";
import { framePepper, type PepperPiece } from "./pepper-cuts";
import { pepperPalette, type PepperPalette } from "./pepper-look";
import { pepperGeometry, SEED, STEM, type PepperProps } from "./pepper-shape";

/** A bell pepper or a chili, whole and glossy, cut open to its ribs and seeds, or roasted until it blisters. */
export function Pepper({ color, shape = "bell", cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.3, seed = 1, ...art }: PepperProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = pepperPalette(color, cooked, cookedColor, browning);

  if (cut === "whole") {
    const g = snap(pepperGeometry(shape, seed));
    const d = smooth(g.outline, true);
    const b = bbox(g.outline);
    return (
      <Art {...art}>
        <defs>
          <Defs u={u} />
        </defs>
        <ellipse cx={(b.l + b.r) / 2 + 2} cy={b.b - 1} rx={b.w * 0.42} ry={4.5} fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />
        <path d={d} fill={pal.skin} />
        <path d={d} fill={`url(#${u("dome")})`} />
        {g.creases.map((c, i) => (
          <path key={i} d={smooth(c, false)} fill="none" stroke={mix(pal.skin, SHADE, 0.35)} strokeWidth={shape === "bell" ? 2.2 : 1.2} strokeLinecap="round" opacity={0.45} filter={`url(#${u("soft")})`} />
        ))}
        {pal.browning > 0.1 && <Blisters id={u("bl")} d={d} box={b} pal={pal} seed={seed} u={u} k={1} />}
        {/* Raw pepper skin is glossy: a long bright streak down one lobe. */}
        <path d={smooth(g.highlight, false)} fill="none" stroke={WHITE} strokeWidth={shape === "bell" ? 4 : 1.8} strokeLinecap="round" opacity={cooked ? 0.25 : 0.6} />
        <path d={d} fill="none" stroke={outline(pal.skin, 0.5)} strokeWidth={EDGE} strokeLinejoin="round" />
        <Stem g={g} cooked={cooked} />
      </Art>
    );
  }

  const { result, pieces, fit, k } = framePepper(shape, cut, seed, layout, cooked);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...art}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        {pieces.map((p, i) => (
          <Piece key={i} p={p} i={i} pal={pal} u={u} k={k} shadow={!heap && pieces.length < 30} cooked={cooked} />
        ))}
      </g>
    </Art>
  );
}

function Stem({ g, cooked }: { g: ReturnType<typeof pepperGeometry>; cooked: boolean }) {
  const c = cooked ? mix(STEM, "#5a4a20", 0.4) : STEM;
  return (
    <>
      <path d={smooth(g.calyx, true)} fill={c} stroke={outline(c, 0.4)} strokeWidth={EDGE * 0.7} strokeLinejoin="round" />
      <path d={smooth(g.stem, true)} fill={lighten(c, 0.15)} stroke={outline(c, 0.4)} strokeWidth={EDGE * 0.7} strokeLinejoin="round" />
    </>
  );
}

type Ids = (n: string) => string;

/**
 * Roasting blisters a pepper's skin in a few broad black patches, more of them and bigger as `browning` rises, with the
 * skin between them darkened; not an all-over speckle.
 */
function Blisters({ id, d, box, pal, seed, u, k }: { id: string; d: string; box: Box; pal: PepperPalette; seed: number; u: Ids; k: number }) {
  const rand = rng(seed * 61 + 9);
  const n = Math.round(2 + pal.browning * 9);
  const size = Math.min(box.w, box.h);
  return (
    <>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={pal.crust} opacity={pal.browning * 0.25} />
        <g filter={`url(#${u("soft")})`}>
          {Array.from({ length: n }, (_, i) => {
            const r = size * (0.08 + rand() * 0.12) * (0.6 + pal.browning * 0.6);
            const [x, y] = [box.l + box.w * (0.1 + rand() * 0.8), box.t + box.h * (0.15 + rand() * 0.75)];
            return <ellipse key={i} cx={x} cy={y} rx={r * 1.3} ry={r} transform={`rotate(${rand() * 180} ${x} ${y})`} fill={pal.crust} opacity={0.55 + pal.browning * 0.35} />;
          })}
        </g>
        {pal.browning > 0.4 && <path d={d} fill="none" stroke={pal.crust} strokeWidth={2 / k} opacity={pal.browning * 0.5} />}
      </g>
    </>
  );
}

function Defs({ u, k = 1 }: { u: Ids; k?: number }) {
  return (
    <>
      <radialGradient id={u("dome")} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.3} />
        <stop offset="0.5" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.3} />
      </radialGradient>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.4 / k} />
      </filter>
      <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={0.8 / k} />
      </filter>
    </>
  );
}

function Piece({ p, i, pal, u, k, shadow, cooked }: { p: PepperPiece; i: number; pal: PepperPalette; u: Ids; k: number; shadow: boolean; cooked: boolean }) {
  const d = polyPath(p.outer);
  const box = bbox(p.outer);
  const size = Math.sqrt(box.w * box.h);
  const edgeW = ((EDGE * 0.7) / k) * Math.min(1, size / 6) + 0.15 / k;
  /** A ring's shadow and side are rings too, so the counter shows through the hollow. */
  const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy])) + (p.hollow && !p.ribs ? " " + polyPath(p.hollow.map(([x, y]): Pt => [x, y + dy])) : "");
  const layers = p.thick * k > 1 ? Math.min(8, Math.round(p.thick * k)) : 0;
  /** A half or ring shows the cut wall as a band round its hollow; a strip or die shows the glossy skin. */
  const face = p.skin ? pal.skin : pal.flesh;
  const ring = p.hollow ? `${d} ${polyPath(p.hollow)}` : d;
  return (
    <g>
      {shadow && <path d={down(p.thick + 1.5)} fill={SHADE} fillRule="evenodd" opacity={0.18} filter={`url(#${u("shadow")})`} />}
      {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
        <path key={dy} d={down(dy)} fill={mix(pal.skin, SHADE, 0.15)} fillRule="evenodd" />
      ))}
      {p.hollow && <path d={polyPath(p.hollow)} fill={p.ribs ? pal.inside : "none"} />}
      {p.ribs?.map((r, j) => (
        <path key={j} d={smooth(r, false)} fill="none" stroke={pal.rib} strokeWidth={2.2 / Math.max(1, k * 0.4)} strokeLinecap="round" />
      ))}
      <path d={ring} fill={face} fillRule="evenodd" />
      {p.seeds?.map(([x, y], j) => (
        <ellipse key={j} cx={x} cy={y} rx={0.9} ry={0.65} fill={SEED} stroke={mix(SEED, SHADE, 0.35)} strokeWidth={0.2} />
      ))}
      {p.skin && !cooked && size > 3 && <path d={d} fill="none" stroke={WHITE} strokeWidth={0.6 / k} opacity={0.5} transform={`translate(${-0.4} ${-0.4})`} />}
      {pal.browning > 0.2 && p.skin && size > 4 && <Blisters id={u(`b${i}`)} d={d} box={box} pal={pal} seed={i} u={u} k={k} />}
      {/* The skin shows as a thin coloured line round every cut face. */}
      <path d={d} fill="none" stroke={p.skin ? outline(pal.skin, 0.45) : pal.skin} strokeWidth={p.skin ? edgeW : edgeW * 1.6} strokeLinejoin="round" />
      {!p.skin && <path d={d} fill="none" stroke={outline(pal.skin, 0.45)} strokeWidth={edgeW * 0.5} strokeLinejoin="round" />}
      {p.stem && <path d={smooth(p.stem, true)} fill={STEM} stroke={outline(STEM, 0.4)} strokeWidth={edgeW} strokeLinejoin="round" />}
    </g>
  );
}
