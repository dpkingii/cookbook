import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { lighten, luma, mix, outline, SHADE, tint, WHITE } from "../core/color";
import { polyPath } from "../core/geometry";
import { rng, smooth, type Pt } from "../core/rough";
import { dustGeometry, type DustProps, type DustShape, type Grain } from "./dust-shape";
import { Pool } from "./Pool";
import { CHAR, SMOKE, clamp, dustLook } from "./dust-look";

interface Shape {
  pts: Pt[];
  /** A paler face: the top facet of a crystal, the broken face of a peppercorn, the sheen on a flake. */
  face: Pt[] | null;
  /** The facet turned away from the light. */
  dark?: Pt[];
  /** A seed lying on a flake. */
  seed: { at: Pt; rx: number; ry: number; rot: number } | null;
}

const around = (c: Pt, rot: number, pts: Pt[]): Pt[] =>
  pts.map(([x, y]) => [c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot)]);

function shapeOf(kind: DustShape, g: Grain, rand: () => number): Shape {
  const s = g.size;
  if (kind === "crystal" || kind === "sugar") {
    const h = s / 2;
    const k = 0.85 + rand() * 0.3;
    return {
      pts: around(g.at, g.rot, [
        [-h, -h * k],
        [h, -h],
        [h * k, h],
        [-h, h * k],
      ]),
      face: around(g.at, g.rot, [
        [-h, -h * k],
        [h, -h],
        [0, 0],
      ]),
      dark: around(g.at, g.rot, [
        [h * k, h],
        [-h, h * k],
        [0, 0],
      ]),
      seed: null,
    };
  }
  if (kind === "flakes") {
    const n = 6;
    const pts = Array.from({ length: n }, (_, i): Pt => {
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const r = (s / 2) * (0.55 + rand() * 0.45);
      return [Math.cos(a) * r, Math.sin(a) * r * 0.55];
    });
    return {
      pts: around(g.at, g.rot, pts),
      face: around(g.at, g.rot, pts.map(([x, y]): Pt => [x * 0.45 - s * 0.08, y * 0.4 - s * 0.05])),
      seed: g.odd ? { at: g.at, rx: s * 0.2, ry: s * 0.14, rot: (g.rot * 180) / Math.PI } : null,
    };
  }
  /** Cracked pepper and powder clumps: jagged chunks, about half showing a paler broken face. */
  const n = 4 + Math.floor(rand() * 2);
  const pts = Array.from({ length: n }, (_, i): Pt => {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.9;
    const r = (s / 2) * (0.6 + rand() * 0.4);
    return [Math.cos(a) * r, Math.sin(a) * r * 0.8];
  });
  return {
    pts: around(g.at, g.rot, pts),
    face: rand() < 0.45 ? around(g.at, g.rot, pts.map(([x, y]): Pt => [x * 0.5 - s * 0.06, y * 0.5 - s * 0.06])) : null,
    seed: null,
  };
}

/**
 * Salt, sugar, flour and spices: a heap on the counter, lit from the upper left so one flank catches the light and
 * the other falls into shade, with grains fallen round its foot. Or a pinch of it, sprinkled out. Cooked, it
 * toasts golden then brown; sugar melts into a pool of caramel instead.
 */
export function Dust({ color, shape = "powder", speckle, layout = "pile", cooked = false, cookedColor, browning = 0.5, seed = 1, size, title, className }: DustProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const look = cooked ? dustLook(shape, cookedColor, browning) : null;
  const melt = look?.melt ?? 0;
  const pinch = layout === "piece";
  const base = look ? look.toast(color) : color;
  /** Sugar glazes amber as it starts to melt. */
  const c = melt > 0 && look ? mix(base, look.caramel, melt * 0.6) : base;
  const odd = speckle ? (look ? look.toast(speckle) : speckle) : c;
  const g = dustGeometry(shape, seed, layout, melt);
  const rand = rng(seed * 17 + 5);
  const { cx, cy, rx, ry } = g.base;
  const px = g.peak[0];
  const zoom = pinch ? 2.4 : 1;
  const edge = outline(c, 0.5);
  const fine = shape === "powder";
  const grainy = !fine;
  /** A pinch has too little sugar to pool; its grains just glaze amber. */
  const melted = melt >= 1 && !pinch;
  const d = g.outline ? smooth(g.outline, true) : "";
  const ridge = clamp((px - (cx - rx)) / (rx * 2));

  /** Each grain is shaded by where it sits: lit on the near flank, in shade past the ridge and low at the foot. */
  const colorOf = (gr: Grain) => {
    const side = g.outline ? (gr.at[0] - px) / rx : 0.1;
    const low = g.outline ? clamp((gr.at[1] - (cy - ry)) / (ry * 2)) : 0;
    const s = side * 0.5 + low * 0.25 + gr.tone * (g.outline ? 0.22 : 0.3);
    const own = gr.odd && speckle ? odd : c;
    return s < 0 ? lighten(own, -s * 0.4) : mix(own, SHADE, s * 0.5);
  };
  const shapes = (list: Grain[]) => (grainy ? list.map((gr) => ({ gr, sh: shapeOf(shape, gr, rand) })) : []);
  const heap = melted ? [] : shapes(g.grains);
  const spill = melted ? [] : shapes(g.spill);
  const dots = fine ? g.spill : [];
  const sparkles = (shape === "crystal" || shape === "sugar") && melt < 0.5 ? [...g.grains, ...g.spill].filter((gr) => gr.tone > 0.75 && gr.at[0] < (pinch ? 60 : px + rx * 0.2)).slice(0, pinch ? 4 : 7) : [];
  const smoke = look && look.burn > 0 && shape !== "crystal" ? look.burn : 0;
  const char = look && look.burn > 0 && !melted && shape !== "crystal" ? Array.from({ length: Math.round(look.burn * 40) }, () => [rand(), rand()]) : [];

  const drawGrain = ({ gr, sh }: { gr: Grain; sh: Shape }, i: number) => {
    const fill = colorOf(gr);
    return (
      <g key={i}>
        <path d={polyPath(sh.pts)} fill={fill} stroke={mix(fill, SHADE, 0.4)} strokeWidth={0.2 * zoom} strokeLinejoin="round" />
        {sh.dark && <path d={polyPath(sh.dark)} fill={mix(fill, SHADE, 0.22)} opacity={0.8} />}
        {sh.face && <path d={polyPath(sh.face)} fill={lighten(shape === "cracked" ? mix(fill, speckle ?? "#a8977a", 0.55) : fill, shape === "flakes" ? 0.18 : 0.3)} opacity={0.85} />}
        {sh.seed && speckle && <ellipse cx={sh.seed.at[0]} cy={sh.seed.at[1]} rx={sh.seed.rx} ry={sh.seed.ry} transform={`rotate(${sh.seed.rot} ${sh.seed.at[0]} ${sh.seed.at[1]})`} fill={odd} stroke={mix(odd, SHADE, 0.4)} strokeWidth={0.15 * zoom} />}
        {melt > 0 && gr.tone > 0.3 && <circle cx={gr.at[0] - gr.size * 0.15} cy={gr.at[1] - gr.size * 0.15} r={gr.size * 0.18} fill={WHITE} opacity={0.7} />}
      </g>
    );
  };

  return (
    <Art size={size} title={title} className={className}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation={2.4} />
        </filter>
        <filter id={u("soft")} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={1.4} />
        </filter>
        <filter id={u("lift")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.45} />
        </filter>
        <filter id={u("smoke")} x="-50%" y="-20%" width="200%" height="140%">
          <feGaussianBlur stdDeviation={1.5} />
        </filter>
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={1.3} numOctaves={2} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(c, SHADE, 0.55), 2.2, -1.05)} />
        </filter>
        <filter id={u("glint")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={1.1} numOctaves={1} seed={seed + 3} />
          <feColorMatrix type="matrix" values={tint(WHITE, 3, -1.75)} />
        </filter>
        <linearGradient id={u("side")} gradientUnits="userSpaceOnUse" x1={cx - rx} y1={0} x2={cx + rx} y2={0}>
          <stop offset="0" stopColor={mix(lighten(c, 0.06), SHADE, grainy ? 0.1 : 0)} />
          <stop offset={Math.max(0, ridge - 0.04)} stopColor={mix(lighten(c, 0.2), SHADE, grainy ? 0.06 : 0)} />
          <stop offset={Math.min(1, ridge + 0.12)} stopColor={mix(c, SHADE, grainy ? 0.18 : 0.12)} />
          <stop offset="1" stopColor={mix(c, SHADE, grainy ? 0.34 : 0.32)} />
        </linearGradient>
        <linearGradient id={u("foot")} gradientUnits="userSpaceOnUse" x1={0} y1={g.peak[1]} x2={0} y2={cy + ry}>
          <stop offset="0.55" stopColor={SHADE} stopOpacity={0} />
          <stop offset="1" stopColor={SHADE} stopOpacity={0.28} />
        </linearGradient>
        <clipPath id={u("in")}>
          <path d={d} />
        </clipPath>
      </defs>

      {melt > 0 && look && !pinch && <Caramel cx={cx} cy={cy} melt={melt} color={look.caramel} browning={look.browning} seed={seed} />}

      {g.outline && !melted && (
        <>
          <ellipse cx={cx + 3} cy={cy + 2} rx={rx * 1.05} ry={ry * 1.15} fill={SHADE} opacity={0.28} filter={`url(#${u("shadow")})`} />
          {/* Fine powder settles in a thin dusting round the heap's foot. */}
          {fine && <ellipse cx={cx} cy={cy + 1} rx={rx * 1.08} ry={ry * 1.28} fill={lighten(c, 0.08)} opacity={0.3} filter={`url(#${u("soft")})`} />}
          <path d={d} fill={`url(#${u("side")})`} />
          <g clipPath={`url(#${u("in")})`}>
            <path d={d} fill={`url(#${u("foot")})`} />
            <path d={d} filter={`url(#${u("grain")})`} opacity={fine ? 0.5 : 0.7} />
            {fine && <path d={d} filter={`url(#${u("glint")})`} opacity={0.35} />}
            {fine && <Slides peak={g.peak} base={g.base} color={c} u={u} seed={seed} />}
            {heap.map(drawGrain)}
            {char.map(([a, b], i) => (
              <circle key={`ch${i}`} cx={cx - rx + a! * rx * 2} cy={g.peak[1] + b! * (cy + ry - g.peak[1])} r={0.5 + (i % 3) * 0.25} fill={CHAR} opacity={0.8} />
            ))}
          </g>
          <path d={d} fill="none" stroke={edge} strokeWidth={EDGE * 0.55} strokeLinejoin="round" />
        </>
      )}

      {/* A pinch of powder lands unevenly: a few overlapping drifts, thickest where most of it fell. */}
      {!g.outline && fine && (
        <g fill={mix(c, SHADE, 0.06 + luma(c) * 0.1)} filter={`url(#${u("soft")})`}>
          <ellipse cx={47} cy={53} rx={24} ry={13} opacity={0.5} />
          <ellipse cx={57} cy={49} rx={15} ry={9} opacity={0.35} transform="rotate(-12 57 49)" />
          <ellipse cx={39} cy={57} rx={11} ry={6} opacity={0.3} />
        </g>
      )}
      {spill.length > 0 && (
        <g transform={`translate(${0.5 * zoom} ${0.8 * zoom})`} fill={SHADE} opacity={0.3} filter={`url(#${u("lift")})`}>
          {spill.map(({ sh }, i) => (
            <path key={i} d={polyPath(sh.pts)} />
          ))}
        </g>
      )}
      {spill.map(drawGrain)}
      {dots.map((gr, i) =>
        pinch && i % 9 === 0 ? (
          <Clump key={i} at={gr.at} r={gr.size * 1.6} color={colorOf(gr)} />
        ) : (
          <circle key={i} cx={gr.at[0]} cy={gr.at[1]} r={gr.size} fill={colorOf(gr)} opacity={0.85} />
        ),
      )}

      {sparkles.map((gr, i) => {
        const r = (1.3 + (i % 3) * 0.5) * (pinch ? 1.6 : 1);
        const [x, y] = [gr.at[0] - gr.size * 0.2, gr.at[1] - gr.size * 0.25];
        return <path key={`sp${i}`} d={`M${x - r} ${y}L${x} ${y - r * 0.18}L${x + r} ${y}L${x} ${y + r * 0.18}ZM${x} ${y - r}L${x + r * 0.18} ${y}L${x} ${y + r}L${x - r * 0.18} ${y}Z`} fill={WHITE} opacity={0.95} />;
      })}

      {smoke > 0 && (
        <g fill="none" stroke={SMOKE} strokeLinecap="round" filter={`url(#${u("smoke")})`} opacity={smoke * 0.7}>
          {[-0.25, 0.2].map((k, i) => {
            const x = (g.outline ? px : 50) + rx * k;
            const y = g.outline ? g.peak[1] + 4 : 46;
            const rise = 16 + i * 4;
            const sway = (i % 2 ? -1 : 1) * 3.5;
            return <path key={i} d={`M${x} ${y}C${x + sway} ${y - rise * 0.35} ${x - sway} ${y - rise * 0.65} ${x + sway * 0.5} ${y - rise}`} strokeWidth={3 - i * 0.5} />;
          })}
        </g>
      )}
    </Art>
  );
}

/** Little ridges where powder slid down the heap's flanks: a lit line over a shadow, fanning from the peak. */
function Slides({ peak, base, color, u, seed }: { peak: Pt; base: { cx: number; cy: number; rx: number; ry: number }; color: string; u: (n: string) => string; seed: number }) {
  const rand = rng(seed * 29 + 7);
  return (
    <g fill="none" strokeLinecap="round" filter={`url(#${u("lift")})`}>
      {[-0.62, -0.2, 0.42].map((k, i) => {
        const end: Pt = [base.cx + k * base.rx * (0.75 + rand() * 0.15), base.cy + base.ry * Math.sqrt(1 - k * k) * 0.4];
        const start: Pt = [peak[0] + k * 9, peak[1] + 9 + rand() * 6];
        const mid: Pt = [(start[0] + end[0]) / 2 + (rand() - 0.5) * 4, (start[1] + end[1]) / 2];
        const p = smooth([start, mid, end], false);
        return (
          <g key={i}>
            <path d={p} transform="translate(0.7 0.4)" stroke={mix(color, SHADE, 0.4)} strokeWidth={1.2} opacity={0.14} />
            <path d={p} stroke={lighten(color, 0.4)} strokeWidth={1} opacity={k < 0 ? 0.3 : 0.14} />
          </g>
        );
      })}
    </g>
  );
}

/** A little clump of powder in a pinch: a soft ball, lit from the upper left. */
function Clump({ at, r, color }: { at: Pt; r: number; color: string }) {
  return (
    <g>
      <ellipse cx={at[0] + r * 0.25} cy={at[1] + r * 0.35} rx={r} ry={r * 0.7} fill={SHADE} opacity={0.18} />
      <ellipse cx={at[0]} cy={at[1]} rx={r} ry={r * 0.75} fill={color} />
      <ellipse cx={at[0] - r * 0.3} cy={at[1] - r * 0.25} rx={r * 0.5} ry={r * 0.32} fill={WHITE} opacity={0.3} />
    </g>
  );
}

/** Melting sugar: a pool of caramel spreading under what is left of the heap, then all of it, bubbling as it darkens. */
function Caramel({ cx, cy, melt, color, browning, seed }: { cx: number; cy: number; melt: number; color: string; browning: number; seed: number }) {
  const s = 0.55 + melt * 0.4;
  /** It spreads from the heap's foot; once the heap is gone, the pool sits in the middle of the box. */
  const at: Pt = [cx, cy - 1 - clamp((melt - 0.8) / 0.2) * 17];
  return (
    <g transform={`translate(${at[0] - 50 * s} ${at[1] - 50 * s}) scale(${s})`}>
      <Pool color={color} shape="syrup" size={100} cooked={browning > 0.6} browning={(browning - 0.6) / 0.4} seed={seed} />
    </g>
  );
}
