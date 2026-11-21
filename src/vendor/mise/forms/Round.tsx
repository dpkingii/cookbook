import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs } from "../core/Browning";
import { Glints, ImperfectDefs, sprinkle } from "../core/Imperfect";
import { lighten, luma, mix, outline, SHADE, tint, WHITE } from "../core/color";
import type { Cut } from "../core/cut";
import { bbox, centroid, polyPath } from "../core/geometry";
import { rng, smooth, type Pt } from "../core/rough";
import { Pool } from "./Pool";
import { CHAR, clamp, fleshOf, roundLook, type RoundLook } from "./round-look";
import { frameRound, roundCut, type Role, type RoundPiece } from "./round-cuts";
import { roundGeometry, type RoundProps, type RoundShape } from "./round-shape";

const GREEN = "#4c7f2a";
const STEM = "#6b4a2a";
const LEAF = "#5d9a34";

/** How shiny each skin is: tomatoes and apples are waxy, citrus peel is pitted and duller. */
const GLOSS: Record<RoundShape, number> = { tomato: 1, apple: 0.8, citrus: 0.45, lemon: 0.5 };

/**
 * A tomato, orange, lime, lemon or apple sitting on the counter, seen a little from above so the stem end shows:
 * the tomato's star of sepals, the apple's stem in its hollow, the citrus's button. Waxy skins shine; citrus peel
 * is pitted with oil glands.
 */
export function Round({ cooked = false, cookedColor, browning = 0.4, ...props }: RoundProps) {
  const shape = props.shape ?? "tomato";
  const flesh = props.flesh ?? fleshOf(shape, props.color);
  const look = cooked ? roundLook(shape, props.color, flesh, cookedColor, browning) : null;
  return props.cut && props.cut !== "whole" ? <CutRound {...props} flesh={flesh} cut={props.cut} look={look} /> : <WholeRound {...props} look={look} />;
}

/** The colour of every kind of part on a cut face. */
function palette(shape: RoundShape, color: string, flesh: string): Record<Role, string> {
  const pith = mix("#fbf6e8", flesh, 0.12);
  return {
    gel: mix(flesh, "#f4c94e", 0.32),
    seed: shape === "apple" ? "#4a2614" : shape === "tomato" ? "#efe0a2" : "#f3ebcf",
    core: mix(flesh, WHITE, 0.38),
    pith,
    segment: flesh,
    pulp: lighten(flesh, 0.42),
    membrane: pith,
    carpel: mix(flesh, "#d2ba84", 0.5),
    vein: mix(flesh, shape === "apple" ? "#b5a25a" : SHADE, 0.45),
    stem: STEM,
    fibre: shape === "tomato" ? mix(flesh, WHITE, 0.3) : mix(flesh, "#c4ad78", 0.5),
  };
}

function WholeRound({ color, blush, shape = "tomato", leaf = false, seed = 1, size, title, className, look }: RoundProps & { look: RoundLook | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = roundGeometry(shape, seed);
  const d = smooth(g.pts, true);
  const c = look ? look.skin : color;
  const gloss = GLOSS[shape] * (look && shape === "apple" ? 1.15 : 1);
  const peel = shape === "citrus" || shape === "lemon";
  const edge = outline(c, 0.72);
  const hi: Pt = [g.cx - g.rx * 0.38, g.cy - g.ry * 0.42];
  const box = { x: g.cx - g.rx - 4, y: g.cy - g.ry - 4, w: g.rx * 2 + 8, h: g.ry * 2 + 8 };
  /** Softened fruit sinks a little and spreads at the foot. */
  const slump = look ? `translate(${g.cx} ${g.bottom}) scale(${1 + look.collapse * 0.35} ${1 - look.collapse}) translate(${-g.cx} ${-g.bottom})` : undefined;
  const wrinkles = look && (shape === "tomato" || shape === "apple") ? wrinkleLines(g, seed, Math.round(3 + look.browning * 7)) : [];
  const blisters = look ? blistersOf(g, shape, seed, look.browning) : [];
  /** Tiny points of light scattered over the lit side: wax on a tomato or apple, oil glands on citrus. */
  const sheenRand = rng(seed * 17 + 5);
  const sheen: Pt[] = Array.from({ length: peel ? 14 : 9 }, () => {
    const a = sheenRand() * Math.PI * 2;
    const d = Math.sqrt(sheenRand());
    return [hi[0] + Math.cos(a) * d * g.rx * 0.5, hi[1] + Math.sin(a) * d * g.ry * 0.38];
  });
  const sheenR = sheen.map(() => (peel ? 0.18 : 0.22) + sheenRand() * 0.25);
  const split = look && shape === "tomato" ? splitOf(g, seed) : null;

  return (
    <Art size={size} title={title} className={className}>
      <defs>
        <clipPath id={u("body")}>
          <path d={d} />
        </clipPath>
        <filter id={u("shadow")} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        <filter id={u("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={1.3} />
        </filter>
        <filter id={u("fine")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={0.45} />
        </filter>
        <filter id={u("wash")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={7} />
        </filter>
        <radialGradient id={u("shade")} gradientUnits="userSpaceOnUse" cx={hi[0]} cy={hi[1]} r={Math.max(g.rx, g.ry) * 1.6}>
          <stop offset="0" stopColor={lighten(c, 0.3)} />
          <stop offset="0.3" stopColor={lighten(c, 0.06)} />
          <stop offset="0.68" stopColor={c} />
          <stop offset="1" stopColor={mix(c, SHADE, 0.55)} />
        </radialGradient>
        <radialGradient id={u("gloss")}>
          <stop offset="0" stopColor={WHITE} stopOpacity={0.55 * gloss + 0.15} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {peel && (
          /** Oil glands: a fine bumpy relief, lit from the upper left, kept only where it falls into shadow. */
          <filter id={u("peel")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={1.05} numOctaves={2} seed={seed} />
            <feDiffuseLighting surfaceScale={1.5} lightingColor={WHITE}>
              <feDistantLight azimuth={225} elevation={48} />
            </feDiffuseLighting>
            <feColorMatrix type="matrix" values={tint(mix(c, SHADE, 0.4), -1.2, 0.84)} />
          </filter>
        )}
        {blush && shape === "tomato" && (
          <radialGradient id={u("shoulder")} gradientUnits="userSpaceOnUse" cx={g.crown[0]} cy={g.crown[1]} r={g.rx * 0.85}>
            <stop offset="0" stopColor={blush} stopOpacity={0.9} />
            <stop offset="0.55" stopColor={blush} stopOpacity={0.45} />
            <stop offset="1" stopColor={blush} stopOpacity={0} />
          </radialGradient>
        )}
        <ImperfectDefs u={u} seed={seed} amount={1.6} />
        {(shape === "tomato" || shape === "apple") && (
          /** Faint, uneven blotches of colour, so the skin is not one perfect gradient. */
          <filter id={u("mottle")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={0.05} numOctaves={3} seed={seed + 4} />
            <feColorMatrix type="matrix" values={tint(mix(c, SHADE, 0.45), 1.6, -0.7)} />
          </filter>
        )}
        {g.hollow.length > 0 && (
          <radialGradient id={u("hollow")}>
            <stop offset="0" stopColor={mix(c, SHADE, 0.75)} stopOpacity={0.9} />
            <stop offset="0.7" stopColor={mix(c, SHADE, 0.5)} stopOpacity={0.5} />
            <stop offset="1" stopColor={mix(c, SHADE, 0.4)} stopOpacity={0} />
          </radialGradient>
        )}
      </defs>

      {look && shape === "apple" && look.browning > 0.3 && (
        /** Baked apple sits in the syrup it gave off. */
        <g transform={`translate(${g.cx - 50 * 0.8} ${g.bottom - 3 - 56 * 0.8}) scale(0.8)`}>
          <Pool color={mix(look.crust, "#e0a040", 0.45)} shape="syrup" size={100} seed={seed} />
        </g>
      )}
      <g transform={slump}>
      <ellipse cx={g.cx + 3} cy={g.bottom - 1} rx={g.rx * 0.82} ry={5} fill={SHADE} opacity={0.32} filter={`url(#${u("shadow")})`} />
      <path d={d} fill={`url(#${u("shade")})`} />
      <g clipPath={`url(#${u("body")})`}>
        {blush && shape === "apple" && (
          <>
            <ellipse cx={g.cx - g.rx * 0.25} cy={g.cy - g.ry * 0.1} rx={g.rx * 0.8} ry={g.ry * 0.9} fill={blush} opacity={0.75} filter={`url(#${u("wash")})`} />
            <g fill="none" stroke={blush} strokeLinecap="round" filter={`url(#${u("fine")})`}>
              {g.meridians.map((m, i) => (
                <path key={i} d={smooth(m.line, false)} strokeWidth={0.8 + m.w * 2.2} opacity={0.35 + m.w * 0.55} />
              ))}
            </g>
          </>
        )}
        {blush && shape === "tomato" && <path d={d} fill={`url(#${u("shoulder")})`} />}
        {blush && peel && (
          <ellipse cx={g.cx + g.rx * 0.3} cy={g.cy + g.ry * 0.1} rx={g.rx * 0.5} ry={g.ry * 0.45} fill={blush} opacity={0.55} filter={`url(#${u("wash")})`} />
        )}
        {blush && <path d={d} fill={`url(#${u("shade")})`} opacity={0.35} />}
        {peel && <rect x={box.x} y={box.y} width={box.w} height={box.h} filter={`url(#${u("peel")})`} />}
        {(shape === "tomato" || shape === "apple") && <rect x={box.x} y={box.y} width={box.w} height={box.h} filter={`url(#${u("mottle")})`} opacity={0.45} />}
        <g fill="none" strokeLinecap="round" filter={`url(#${u("soft")})`}>
          {g.ribs.map((r, i) => (
            <g key={i}>
              <path d={smooth(r, false)} stroke={mix(c, SHADE, 0.6)} strokeWidth={2.4} opacity={shape === "apple" ? 0.16 : 0.32} />
              <path d={smooth(r, false)} stroke={lighten(c, 0.35)} strokeWidth={1.4} opacity={0.22} transform="translate(-1.6 0.4)" />
            </g>
          ))}
        </g>
        {g.dots.map((p, i) => (
          <ellipse key={i} cx={p.at[0]} cy={p.at[1]} rx={0.2 + p.face * 0.2} ry={0.16 + p.face * 0.12} fill={mix(c, "#fff3c4", 0.7)} opacity={0.25 + p.face * 0.35} />
        ))}
        {/* Light bouncing up off the counter, along the lower edge. */}
        <path d={d} fill="none" stroke={lighten(c, 0.3)} strokeWidth={3.5} opacity={0.3} transform="translate(-2 -2.5)" filter={`url(#${u("soft")})`} />
        <ellipse cx={hi[0]} cy={hi[1]} rx={g.rx * 0.42} ry={g.ry * 0.3} fill={`url(#${u("gloss")})`} transform={`rotate(-28 ${hi[0]} ${hi[1]})`} />
        <Glints at={sheen} r={sheenR} opacity={peel ? 0.7 : 0.6} />
        {gloss > 0.6 && (
          <g filter={`url(#${u("rough")})`}>
            <ellipse cx={hi[0] - 1} cy={hi[1] - 0.5} rx={4.2} ry={2.2} fill={WHITE} opacity={0.75 * gloss} transform={`rotate(-30 ${hi[0] - 1} ${hi[1] - 0.5})`} />
            <ellipse cx={hi[0] + 5.5} cy={hi[1] + 3.5} rx={1.3} ry={0.8} fill={WHITE} opacity={0.6 * gloss} />
          </g>
        )}
        {g.hollow.length > 0 && <path d={smooth(g.hollow, true)} fill={`url(#${u("hollow")})`} filter={`url(#${u("soft")})`} />}
        {blisters.map((b, i) => (
          <g key={i} transform={`translate(${b.at[0]} ${b.at[1]}) rotate(${b.rot})`} filter={`url(#${u(peel ? "soft" : "fine")})`}>
            <ellipse rx={b.r * 1.5} ry={b.r * b.flat * 1.4} fill={lighten(c, 0.35)} opacity={0.3} />
            <ellipse rx={b.r} ry={b.r * b.flat} fill={mix(look!.crust, CHAR, look!.browning * 0.6)} opacity={0.5 + look!.browning * 0.4} />
          </g>
        ))}
        {wrinkles.map((w, i) => (
          <g key={i} fill="none" strokeLinecap="round">
            <path d={smooth(w, false)} stroke={mix(c, SHADE, 0.6)} strokeWidth={0.8} opacity={0.55} />
            <path d={smooth(w, false)} stroke={lighten(c, 0.4)} strokeWidth={0.5} opacity={0.45} transform="translate(-0.4 -0.7)" />
          </g>
        ))}
        {split && (
          <g strokeLinejoin="round">
            <path d={smooth(split.lips, true)} fill={lighten(c, 0.25)} opacity={0.7} />
            <path d={smooth(split.gap, true)} fill={mix(look!.flesh, SHADE, 0.3)} stroke={mix(c, SHADE, 0.6)} strokeWidth={0.6} />
            <path d={smooth(split.gap.slice(1, 6), false)} fill="none" stroke={WHITE} strokeWidth={0.5} opacity={0.5} transform="translate(-0.5 0)" />
            <path d={smooth(split.gap, true)} fill="none" stroke={look!.crust} strokeWidth={1.2} opacity={0.4 + look!.browning * 0.4} />
          </g>
        )}
      </g>
      <path d={d} fill="none" stroke={edge} strokeWidth={EDGE} strokeLinejoin="round" />
      <Crown shape={shape} g={g} color={c} leaf={leaf && !look} u={u} withered={look ? 0.35 + look.browning * 0.4 : 0} />
      </g>
    </Art>
  );
}

/** Fine creases where the skin has loosened over softening flesh. */
function wrinkleLines(g: ReturnType<typeof roundGeometry>, seed: number, count: number): Pt[][] {
  const rand = rng(seed * 5 + 1);
  return Array.from({ length: count }, () => {
    const t = 0.15 + rand() * 0.45;
    const phi = Math.PI / 2 + (rand() - 0.5) * 2.4;
    const span = 0.12 + rand() * 0.18;
    return [-1, -0.3, 0.3, 1].map((k, j) => g.project(t + (j % 2 ? 0.006 : -0.004) * (rand() + 0.5), phi + k * span).at);
  });
}

/** Blistered, blackened spots where the skin touched the heat: many on tomatoes, a few on citrus, apples only when pushed. */
function blistersOf(g: ReturnType<typeof roundGeometry>, shape: RoundShape, seed: number, b: number) {
  const rand = rng(seed * 11 + 4);
  /** Citrus chars only where it lay on the grill, low down, in broad soft patches. */
  const citrus = shape === "citrus" || shape === "lemon";
  const count = Math.round(shape === "tomato" ? 2 + b * 16 : shape === "apple" ? Math.max(0, b - 0.55) * 18 : Math.max(0, b - 0.3) * 8);
  const out: { at: Pt; r: number; flat: number; rot: number }[] = [];
  for (let tries = 0; out.length < count && tries < count * 6; tries++) {
    const p = citrus ? g.project(0.62 + rand() * 0.3, Math.PI / 2 + (rand() - 0.5) * 2.2) : g.project(0.1 + rand() * 0.8, Math.PI / 2 + (rand() - 0.5) * 2.8);
    const face = Math.min(1, p.z / 25);
    const r = (1 + rand() * 2.2 + b * 1.2) * (0.6 + face * 0.4) * (citrus ? 2 : 1);
    if (face > 0.15) out.push({ at: p.at, r, flat: citrus ? 0.4 : 0.45 + face * 0.45, rot: (rand() - 0.5) * 40 });
  }
  return out;
}

/** A roasted tomato's skin splits along one side, showing the jammy flesh. */
function splitOf(g: ReturnType<typeof roundGeometry>, seed: number) {
  const rand = rng(seed * 3 + 2);
  const phi = Math.PI / 2 + (rand() - 0.5) * 1.4;
  const edge = (sgn: number, wide: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const u = i / 6;
      return g.project(0.3 + u * 0.24, phi + sgn * wide * Math.sin(Math.PI * u) ** 0.8 + (rand() - 0.5) * 0.02).at;
    });
  return { gap: [...edge(1, 0.09), ...edge(-1, 0.09).reverse()], lips: [...edge(1, 0.14), ...edge(-1, 0.14).reverse()] };
}

function Crown({ shape, g, color, leaf, u, withered = 0 }: { shape: RoundShape; g: ReturnType<typeof roundGeometry>; color: string; leaf: boolean; u: (n: string) => string; withered?: number }) {
  const [x, y] = g.crown;
  const CALYX = mix(GREEN, "#4a3a1c", withered);
  if (shape === "tomato")
    return (
      <g strokeLinejoin="round" strokeLinecap="round">
        {g.sepals.map((s, i) => (
          <path key={i} d={smooth(s, true)} fill={i % 2 ? CALYX : lighten(CALYX, 0.1)} stroke={mix(CALYX, SHADE, 0.6)} strokeWidth={EDGE * 0.5} />
        ))}
        <path d={smooth(g.stem, false)} stroke={mix(CALYX, SHADE, 0.55)} strokeWidth={3.6} fill="none" />
        <path d={smooth(g.stem, false)} stroke={lighten(CALYX, 0.05)} strokeWidth={2.2} fill="none" />
        <ellipse cx={g.stem[2]![0]} cy={g.stem[2]![1]} rx={1.4} ry={0.8} fill={lighten(CALYX, 0.45)} stroke={mix(CALYX, SHADE, 0.5)} strokeWidth={0.5} />
      </g>
    );
  if (shape === "apple") {
    const top = g.stem[2]!;
    const mid = g.stem[1]!;
    return (
      <g strokeLinecap="round">
        <path d={smooth(g.stem, false)} stroke={mix(STEM, SHADE, 0.5)} strokeWidth={2.6} fill="none" />
        <path d={smooth(g.stem, false)} stroke={lighten(STEM, 0.15)} strokeWidth={1.3} fill="none" transform="translate(-0.4 0)" />
        <ellipse cx={top[0]} cy={top[1]} rx={1.3} ry={0.7} fill={mix(STEM, WHITE, 0.3)} />
        {leaf && <Leaf at={mid} u={u} />}
      </g>
    );
  }
  if (shape === "lemon")
    return (
      <g>
        <ellipse cx={x + 1} cy={y} rx={1.8} ry={2.6} fill={mix(color, "#7f8a2c", 0.45)} stroke={mix(color, SHADE, 0.7)} strokeWidth={EDGE * 0.5} />
        <circle cx={x + 0.6} cy={y} r={0.7} fill={mix("#7f8a2c", SHADE, 0.4)} />
      </g>
    );
  /** The citrus button: a little green-brown star where the stem broke off, foreshortened on the top. */
  const flat = 0.55;
  const star = Array.from({ length: 10 }, (_, i): Pt => {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 ? 1.1 : 2.4;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r * flat];
  });
  return (
    <g>
      <ellipse cx={x} cy={y + 0.4} rx={4} ry={4 * flat} fill={mix(color, SHADE, 0.35)} opacity={0.45} />
      <path d={smooth(star, true)} fill="#8a8a3c" stroke={mix("#8a8a3c", SHADE, 0.6)} strokeWidth={EDGE * 0.4} />
      <circle cx={x} cy={y} r={0.8} fill={mix("#8a8a3c", SHADE, 0.5)} />
    </g>
  );
}

function Leaf({ at, u }: { at: Pt; u: (n: string) => string }) {
  const [x, y] = at;
  const pts: Pt[] = [
    [x, y],
    [x + 5, y - 5.5],
    [x + 12, y - 7.5],
    [x + 19, y - 6],
    [x + 13, y - 1.5],
    [x + 6, y + 0.6],
  ];
  return (
    <g>
      <defs>
        <linearGradient id={u("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={lighten(LEAF, 0.2)} />
          <stop offset="1" stopColor={mix(LEAF, SHADE, 0.35)} />
        </linearGradient>
      </defs>
      <path d={smooth(pts, true)} fill={`url(#${u("leaf")})`} stroke={mix(LEAF, SHADE, 0.6)} strokeWidth={EDGE * 0.5} strokeLinejoin="round" />
      <path d={`M${x + 0.5} ${y - 0.3}Q${x + 9} ${y - 5} ${x + 18.5} ${y - 6}`} fill="none" stroke={lighten(LEAF, 0.4)} strokeWidth={0.6} />
    </g>
  );
}

function CutRound({ color: raw, flesh: fleshProp, shape = "tomato", cut, layout = "pile", seed = 1, size, title, className, look }: RoundProps & { cut: Exclude<Cut, "whole">; look: RoundLook | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const color = look ? look.skin : raw;
  const flesh = look ? look.flesh : (fleshProp ?? fleshOf(shape, raw));
  const pal = palette(shape, color, flesh);
  /** Cooked tomato gel turns to jam. */
  if (look) pal.gel = mix(pal.gel, flesh, 0.55);
  const { result, pieces: shown, fit, k } = frameRound(shape, cut, seed, layout, !!look);
  /** Grilled citrus halves and wheels carry the bars of the grill. */
  const grill = look && (shape === "citrus" || shape === "lemon") && (roundCut(shape, cut) === "halved" || roundCut(shape, cut) === "sliced") ? clamp((look.browning - 0.2) / 0.4) : 0;
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const skinEdge = outline(color, 0.6);
  const fleshEdge = outline(flesh, 0.38 + (1 - luma(flesh)) * 0.2);
  const sides = { skin: mix(color, SHADE, 0.2), flesh: mix(flesh, SHADE, 0.08 + (1 - luma(flesh)) * 0.3), pith: mix(pal.pith, SHADE, 0.12) };
  const faces = { flesh, pith: pal.pith, skin: color };
  /** Small pieces get a finer edge, so a heap reads as food and not as a dark mesh. */
  const edgeOf = (p: RoundPiece) => {
    const b = bbox(p.outer);
    return (EDGE / k) * Math.min(1, Math.sqrt(b.w * b.h) / 12);
  };
  const path = (p: RoundPiece, dy = 0) => {
    const at = (pts: Pt[]) => polyPath(pts.map(([x, y]): Pt => [x, y + dy]));
    return at(p.outer) + (p.hole ? at(p.hole) : "");
  };
  const open = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}`;
  const part = (q: { role: Role; pts: Pt[]; closed: boolean; w?: number }, j: number) =>
    q.closed ? (
      <path key={j} d={smooth(q.pts, true)} fill={pal[q.role]} opacity={q.role === "gel" ? 0.9 : 1} stroke={q.role === "seed" || q.role === "carpel" ? mix(pal[q.role], SHADE, 0.35) : "none"} strokeWidth={0.25} />
    ) : (
      <path key={j} d={smooth(q.pts, false)} fill="none" stroke={pal[q.role]} strokeWidth={q.w ?? 0.6} strokeLinecap="round" opacity={q.role === "pulp" ? 0.55 : q.role === "vein" ? 0.7 : q.role === "fibre" ? 0.45 : 1} />
    );

  return (
    <Art size={size} title={title} className={className}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.6 / k} />
        </filter>
        <radialGradient id={u("wet")} cx="0.32" cy="0.28" r="0.5">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.55} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={u("dim")} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0.55" stopColor={SHADE} stopOpacity={0} />
          <stop offset="1" stopColor={SHADE} stopOpacity={0.22} />
        </radialGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} />}
        <ImperfectDefs u={u} k={k} seed={seed} cells={mix(flesh, SHADE, 0.4)} />
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {result.heap && (
          <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />
        )}
        {order.map((p, i) => {
          if (p.strand) {
            const d = smooth(p.outer, false);
            return (
              <g key={i} fill="none" strokeLinecap="round">
                <path d={d} stroke={pal.pith} strokeWidth={p.strand * 1.25} transform="translate(0.25 0.35)" />
                <path d={d} stroke={color} strokeWidth={p.strand} />
                <path d={d} stroke={mix(color, SHADE, 0.5)} strokeWidth={p.strand + 0.35} opacity={0.35} />
                <path d={d} stroke={lighten(color, 0.4)} strokeWidth={p.strand * 0.3} transform="translate(-0.15 -0.15)" opacity={0.7} />
              </g>
            );
          }
          const layers = Math.max(1, Math.round(p.thick * k));
          const side = sides[p.side];
          const edge = p.side === "skin" || p.face === "skin" ? skinEdge : fleshEdge;
          const clip = u(`c${i}`);
          return (
            <g key={i}>
              {!result.heap && (
                <path d={path(p, p.thick + 2)} transform="translate(2 0)" fill={SHADE} fillRule="evenodd" opacity={0.24} filter={`url(#${u("shadow")})`} />
              )}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={path(p, dy)} fill={mix(side, SHADE, (dy / Math.max(1, p.thick)) * 0.25)} fillRule="evenodd" />
              ))}
              <path d={path(p, p.thick)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <clipPath id={clip}>
                <path d={path(p)} clipRule="evenodd" />
              </clipPath>
              <path d={path(p)} fill={faces[p.face]} fillRule="evenodd" />
              <g clipPath={`url(#${clip})`}>
                {!result.heap && p.face !== "skin" && (() => {
                  const b = bbox(p.outer);
                  return <rect x={b.l} y={b.t} width={b.w} height={b.h} filter={`url(#${u("cells")})`} opacity={0.5} />;
                })()}
                {p.parts.map(part)}
                {!result.heap && <WetGlints p={p} seed={seed * 7 + i} />}
                {p.rind.map((r, j) => (
                  <g key={j} fill="none" strokeLinejoin="round">
                    {p.pithW > 0 && <path d={open(r)} stroke={pal.pith} strokeWidth={(p.rindW + p.pithW) * 2} />}
                    <path d={open(r)} stroke={color} strokeWidth={p.rindW * 2} />
                  </g>
                ))}
                {look && !result.heap && (() => {
                  const b = bbox(p.outer);
                  return (
                    <>
                      <rect x={b.l - 2} y={b.t - 2} width={b.w + 4} height={b.h + 4} filter={`url(#${u("brown")})`} opacity={0.3 + look.browning * 0.4} />
                      <path d={path(p)} fill="none" stroke={look.crust} strokeWidth={2.4} opacity={0.2 + look.browning * 0.6} filter={`url(#${u("brownEdge")})`} />
                      {grill > 0 &&
                        [-2, -1, 0, 1, 2].map((j) => {
                          const [cx, cy] = [b.cx + j * b.w * 0.22, b.cy];
                          return <path key={j} d={`M${cx - b.h * 0.5} ${cy + b.h * 0.7}L${cx + b.h * 0.5} ${cy - b.h * 0.7}`} stroke={mix(look.crust, CHAR, 0.4)} strokeWidth={Math.max(1.2, b.w * 0.06)} strokeLinecap="round" opacity={grill * 0.85} filter={`url(#${u("brownEdge")})`} />;
                        })}
                    </>
                  );
                })()}
                {look && result.heap && <path d={path(p)} fill={look.crust} opacity={look.browning * 0.35} />}
                {p.face === "skin" && <path d={open(p.outer.slice(0, Math.ceil(p.outer.length / 2)))} fill="none" stroke={lighten(color, 0.35)} strokeWidth={0.6} opacity={0.6} />}
                <path d={path(p)} fill={`url(#${u("dim")})`} fillRule="evenodd" />
                <path d={path(p)} fill={`url(#${u("wet")})`} fillRule="evenodd" />
              </g>
              <path d={path(p)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              {p.over.map((q, j) => (
                <g key={j} fill="none" strokeLinecap="round">
                  <path d={smooth(q.pts, false)} stroke={mix(STEM, SHADE, 0.5)} strokeWidth={(q.w ?? 1) + 0.6} />
                  <path d={smooth(q.pts, false)} stroke={lighten(STEM, 0.12)} strokeWidth={q.w ?? 1} />
                </g>
              ))}
            </g>
          );
        })}
      </g>
    </Art>
  );
}

/** Every seed catches a point of light; gel and juicy segments glisten here and there; cut flesh is just damp. */
function WetGlints({ p, seed }: { p: RoundPiece; seed: number }) {
  const rand = rng(seed);
  const seeds: Pt[] = [];
  const seedR: number[] = [];
  const wet: Pt[] = [];
  const wetR: number[] = [];
  for (const q of p.parts) {
    if (!q.closed) continue;
    const b = bbox(q.pts);
    const small = Math.min(b.w, b.h);
    if (q.role === "seed") {
      seeds.push([b.l + b.w * 0.38, b.t + b.h * 0.36]);
      seedR.push(small * 0.13);
    } else if ((q.role === "gel" && rand() < 0.8) || (q.role === "segment" && rand() < 0.45)) {
      for (const g of sprinkle(q.pts, 1, rand, 0.3)) {
        wet.push(g);
        wetR.push(small * (0.025 + rand() * 0.02));
      }
    }
  }
  if (p.face === "flesh" && seeds.length + wet.length === 0) {
    const b = bbox(p.outer);
    for (const g of sprinkle(p.outer, 2, rand, 0.2)) {
      wet.push(g);
      wetR.push(Math.min(b.w, b.h) * (0.012 + rand() * 0.012));
    }
  }
  return (
    <>
      <Glints at={seeds} r={seedR} opacity={0.8} />
      <Glints at={wet} r={wetR} opacity={0.75} stretch={2.4} />
    </>
  );
}
