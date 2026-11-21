import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import { area, inside } from "../core/geometry";
import { ring, rng, shift, smooth, type Pt } from "../core/rough";
import { BODY, poolGeometry, type PoolProps } from "./pool-shape";
import { CARAMEL, CHAR, SMOKE, GLOW, poolLook } from "./pool-look";

/** Points scattered inside a polygon, deterministically. `keep` can turn a point away, as to push bubbles to the edge. */
function scatter(poly: Pt[], count: number, rand: () => number, keep: (p: Pt) => boolean = () => true): Pt[] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const out: Pt[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const p: Pt = [l + rand() * (r - l), t + rand() * (b - t)];
    if (inside(p, poly) && keep(p)) out.push(p);
  }
  return out;
}

const toward = (c: Pt, p: Pt, k: number): Pt => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k];

/** A spoon's swirl: a spiral round `c`, squashed like the pool, its radius wandering so it doesn't look stamped. */
function swirl(c: Pt, rx: number, ry: number, turns: number, rand: () => number): Pt[] {
  const n = Math.round(turns * 20);
  const [ph, start] = [rand() * 6, rand() * 6];
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const t = i / n;
    const th = start + t * turns * Math.PI * 2;
    const r = (0.12 + 0.48 * t ** 0.8) * (1 + 0.07 * Math.sin(3 * th + ph));
    return [c[0] + Math.cos(th) * rx * r, c[1] + Math.sin(th) * ry * r];
  });
}

/**
 * A pool of liquid on the counter, or one drop of it. Clear liquids let light through: a bright crescent where it
 * leaves the far edge and a shadow tinted their own colour. Thick ones stand up in a dome with a soft wall.
 * Cooked, it reduces: smaller, deeper and glossier inside the dark tide line it left, with simmer bubbles.
 */
export function Pool({
  color,
  shape = "thin",
  flecks,
  beads,
  layout = "pile",
  cooked = false,
  cookedColor,
  browning = 0.5,
  seed = 1,
  size,
  title,
  className,
}: PoolProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const body = BODY[shape];
  const piece = layout === "piece";
  const look = cooked ? poolLook(shape, color, cookedColor, browning) : null;
  const reduce = look?.reduce ?? 0;
  const g = poolGeometry(shape, seed, layout, reduce);
  const c = look ? look.color : color;
  const clarity = Math.min(1, body.clarity + reduce * 0.35);
  const clear = 1 - clarity;
  const gloss = body.gloss + reduce * 0.3;
  const dome = Math.min(1, g.height / 3.2);
  const H = g.height;
  const d = smooth(g.surface, true);
  const rand = rng(seed * 13 + 3);
  const edge = outline(c, 0.5);
  const unit = piece ? 1.7 : 1;
  /** The liquid's silhouette: its surface swept down by its height, so the near side shows as a wall. */
  const wall = smooth(
    g.surface.map(([x, y]): Pt => [x, y > g.c[1] ? y + H : y + H * Math.max(0, 1 - (g.c[1] - y) / (g.ry * 0.25))]),
    true,
  );
  const shadowFrom = g.surface;
  const n = g.surface.length;
  const arc = (from: number, to: number, k: number) => g.surface.slice(Math.round(n * from), Math.round(n * to)).map((p) => toward(g.c, p, k));
  const crescent = (dx: number, dy: number) => `${d} ${smooth(shift(g.surface, dx, dy), true)}`;
  const deep = Math.max(g.rx, g.ry);

  const fleckPts = flecks ? scatter(g.surface.map((p) => toward(g.c, p, 0.88)), piece ? 9 : Math.round(area(g.surface) / 70), rand) : [];
  const beadPts = beads
    ? Array.from({ length: piece ? 1 : 3 }).flatMap(() => {
        const [at] = scatter(g.surface.map((p) => toward(g.c, p, 0.7)), 1, rand);
        if (!at) return [];
        return Array.from({ length: piece ? 5 : 4 + Math.floor(rand() * 4) }, (): [Pt, number] => {
          const r = (0.6 + rand() * rand() * 2) * unit;
          return [[at[0] + (rand() * 2 - 1) * 7 * unit, at[1] + (rand() * 2 - 1) * 4 * unit], r];
        }).filter(([p]) => inside(p, g.surface));
      })
    : [];
  const hot = look && shape !== "oil";
  const bubbles = hot
    ? scatter(
        g.surface.map((p) => toward(g.c, p, 0.9)),
        Math.round((piece ? 2 : 7) + (piece ? 3 : 10) * look.browning * (1 - look.burn * 0.6)),
        rand,
        (p) => look.browning > 0.3 || Math.hypot((p[0] - g.c[0]) / g.rx, (p[1] - g.c[1]) / g.ry) > 0.55,
      ).map((p): [Pt, number] => [p, (1 + rand() * (0.7 + 1.4 * look.browning)) * unit])
    : [];
  const smoke = look && shape === "oil" ? Math.max(0, (look.browning - 0.55) / 0.45) : 0;

  return (
    <Art size={size} title={title} className={className}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={2.2} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation={1.1} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation={0.35} />
        </filter>
        <filter id={u("smoke")} x="-50%" y="-20%" width="200%" height="140%">
          <feGaussianBlur stdDeviation={1.5} />
        </filter>
        <filter id={u("pulp")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={shape === "sauce" ? 0.32 : 0.18} numOctaves={3} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(c, SHADE, 0.45), 1.4, -0.55)} />
        </filter>
        <radialGradient id={u("top")} cx="0.38" cy="0.3" r="0.8">
          {/* Light through oil comes out golden, so clear oil lightens toward warm light, not white. */}
          <stop offset="0" stopColor={shape === "oil" ? mix(c, GLOW, 0.06 + clear * 0.36) : lighten(c, 0.06 + dome * 0.16 + clear * 0.14)} />
          <stop offset="0.55" stopColor={shape === "oil" ? mix(c, GLOW, clear * 0.12) : c} />
          <stop offset="1" stopColor={mix(c, SHADE, 0.12 + clarity * 0.12)} />
        </radialGradient>
        {/* A clear wall glows at its foot where light comes through; an opaque one darkens toward the counter. */}
        <linearGradient id={u("wall")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor={mix(c, SHADE, clear > 0.4 ? 0.3 : 0.12)} />
          <stop offset="1" stopColor={clear > 0.4 ? lighten(c, 0.18) : mix(c, SHADE, 0.45)} />
        </linearGradient>
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.14} />}
        <clipPath id={u("in")}>
          <path d={d} />
        </clipPath>
      </defs>

      {g.tide && look && (
        <g>
          <path d={smooth(g.tide, true)} fill={mix(look.crust, CARAMEL, 0.5)} opacity={0.06 + look.browning * 0.12} />
          <path d={smooth(g.tide, true)} fill="none" stroke={look.crust} strokeWidth={1.3 * unit} opacity={0.25 + look.browning * 0.45} filter={`url(#${u("fine")})`} />
          <path
            d={smooth(g.tide.map((p, i) => toward(g.c, p, 0.97 - (i % 7) * 0.002)), true)}
            fill="none"
            stroke={look.crust}
            strokeWidth={0.7 * unit}
            opacity={0.12 + look.browning * 0.25}
            filter={`url(#${u("fine")})`}
          />
        </g>
      )}

      <path
        d={smooth(shift(shadowFrom, 2, H + 1.6), true)}
        fill={clear > 0.4 ? mix(c, SHADE, 0.25) : SHADE}
        opacity={clear > 0.4 ? 0.16 + clarity * 0.14 : 0.24}
        filter={`url(#${u("shadow")})`}
      />

      {g.drops.map((dp, i) => {
        const dd = smooth(dp, true);
        const [xs, ys] = [dp.map((p) => p[0]), dp.map((p) => p[1])];
        const [cx, cy] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
        const r = (Math.max(...xs) - Math.min(...xs)) / 2;
        if (look && reduce > 0) return <path key={i} d={dd} fill={look.crust} opacity={0.3 + look.browning * 0.4} />;
        return (
          <g key={i}>
            <path d={smooth(shift(dp, 0, Math.min(1, H)), true)} fill={mix(c, SHADE, 0.3)} />
            <path d={dd} fill={c} />
            {clear > 0.4 && <ellipse cx={cx + r * 0.25} cy={cy + r * 0.15} rx={r * 0.45} ry={r * 0.3} fill={lighten(c, 0.5)} opacity={clear * 0.7} />}
            <path d={dd} fill="none" stroke={edge} strokeWidth={EDGE * 0.45} />
            <circle cx={cx - r * 0.3} cy={cy - r * 0.25} r={Math.max(0.4, r * 0.22)} fill={WHITE} opacity={0.85} />
          </g>
        );
      })}

      <path d={wall} fill={`url(#${u("wall")})`} />
      <path d={d} fill={`url(#${u("top")})`} />
      <g clipPath={`url(#${u("in")})`}>
        {(shape === "sauce" || shape === "creamy") && <path d={d} filter={`url(#${u("pulp")})`} opacity={shape === "sauce" ? 0.5 : 0.18} />}

        {clear > 0.4 && (
          <>
            {/* Light through a clear liquid: the thin edge glows, a bright crescent lands on the far side, the near rim refracts dark. */}
            <path d={d} fill="none" stroke={lighten(c, 0.3)} strokeWidth={5 * unit} opacity={clear * 0.55} filter={`url(#${u("soft")})`} />
            <path d={crescent(-2.2 * unit, -1.8 * unit)} fillRule="evenodd" fill={lighten(c, 0.55)} opacity={clear * 0.85} filter={`url(#${u("fine")})`} />
            <path d={crescent(1.4 * unit, 1.2 * unit)} fillRule="evenodd" fill={mix(c, SHADE, 0.45)} opacity={clear * 0.45} filter={`url(#${u("fine")})`} />
          </>
        )}
        {clear <= 0.4 && <path d={crescent(-1.8 * unit, -2 * unit)} fillRule="evenodd" fill={mix(c, SHADE, 0.3)} opacity={0.25 + dome * 0.3} filter={`url(#${u("soft")})`} />}

        {shape === "syrup" && <Heap c={g.c} rx={g.rx} ry={g.ry} color={c} u={u} seed={seed} piece={piece} />}
        {(shape === "sauce" || shape === "creamy") && <Folds c={g.c} rx={g.rx} ry={g.ry} color={c} u={u} turns={piece ? 0.8 : 1.2} soft={shape === "creamy"} seed={seed} />}

        {fleckPts.map((p, i) => {
          const s = (0.5 + rand() * 0.9) * unit;
          const pts = ring(p[0], p[1], s * 1.2, s * 0.7, seed * 31 + i, 0.4, 4);
          return <path key={i} d={`M${pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L")}Z`} fill={mix(flecks!, SHADE, rand() * 0.35)} opacity={clear > 0.4 ? 0.85 : 0.95} />;
        })}

        {beadPts.map(([p, r], i) => (
          <g key={i}>
            <ellipse cx={p[0]} cy={p[1]} rx={r} ry={r * 0.8} fill={beads} opacity={0.55} stroke={mix(beads!, SHADE, 0.35)} strokeWidth={0.3} />
            <circle cx={p[0] - r * 0.35} cy={p[1] - r * 0.3} r={r * 0.3} fill={WHITE} opacity={0.8} />
          </g>
        ))}

        {look && reduce > 0 && <path d={d} fill="none" stroke={look.crust} strokeWidth={(2 + look.browning * 3) * unit} opacity={0.08 + look.browning * 0.4} filter={`url(#${u("soft")})`} />}
        {look && look.burn > 0 && <path d={d} fill="none" stroke={CHAR} strokeWidth={4 * unit} opacity={look.burn * 0.7} filter={`url(#${u("brownEdge")})`} />}

        {bubbles.map(([p, r], i) => (
          <g key={i}>
            <ellipse cx={p[0]} cy={p[1]} rx={r} ry={r * 0.85} fill={lighten(c, 0.22)} opacity={0.35} stroke={mix(c, SHADE, 0.5)} strokeWidth={0.35} />
            <ellipse cx={p[0] + r * 0.2} cy={p[1] + r * 0.3} rx={r * 0.55} ry={r * 0.3} fill={lighten(c, 0.4)} opacity={0.4} />
            <circle cx={p[0] - r * 0.35} cy={p[1] - r * 0.35} r={Math.max(0.3, r * 0.28)} fill={WHITE} opacity={0.9} />
          </g>
        ))}

        {look && shape === "oil" && <Shimmer c={g.c} rx={g.rx} ry={g.ry} color={c} lines={piece ? 2 : 3} seed={seed} />}

        {/* Dome highlight on thick liquids; window glints and the lit rim on everything. */}
        {dome > 0.5 && <ellipse cx={g.c[0] - g.rx * 0.22} cy={g.c[1] - g.ry * 0.32} rx={g.rx * 0.36} ry={g.ry * 0.24} fill={WHITE} opacity={0.16 * dome * gloss} filter={`url(#${u("soft")})`} />}
      </g>

      <path d={smooth(arc(0.54, 0.73, 1 - (2.4 * unit) / deep), false)} fill="none" stroke={WHITE} strokeWidth={(piece ? 1.8 : 1.2) * gloss} strokeLinecap="round" opacity={0.7} filter={`url(#${u("fine")})`} />
      <path d={smooth(arc(0.08, 0.2, 1 - (2.6 * unit) / deep), false)} fill="none" stroke={WHITE} strokeWidth={0.8 * gloss * unit} strokeLinecap="round" opacity={0.35} filter={`url(#${u("fine")})`} />
      <Glints c={g.c} rx={g.rx} ry={g.ry} gloss={gloss} soft={shape === "creamy"} u={u} piece={piece} />

      {/* A thick liquid rounds over into its wall, so the lip is a soft light line; the outline goes round the whole silhouette. */}
      {H > 1.2 && <path d={smooth(arc(0, 0.5, 1), false)} fill="none" stroke={lighten(c, 0.35)} strokeWidth={0.7} opacity={0.45} filter={`url(#${u("fine")})`} />}
      <path d={wall} fill="none" stroke={edge} strokeWidth={EDGE * (0.5 + clarity * 0.4)} strokeLinejoin="round" />

      {smoke > 0 && (
        <g fill="none" stroke={SMOKE} strokeLinecap="round" filter={`url(#${u("smoke")})`} opacity={smoke * 0.7}>
          {[-0.4, 0.05, 0.45].map((k, i) => {
            const x = g.c[0] + g.rx * k;
            const y = g.c[1] - g.ry * 0.5;
            const rise = 20 + i * 5;
            const sway = (i % 2 ? -1 : 1) * 4;
            return <path key={i} d={`M${x} ${y}C${x + sway} ${y - rise * 0.35} ${x - sway} ${y - rise * 0.65} ${x + sway * 0.5} ${y - rise}`} strokeWidth={3.2 - i * 0.5} />;
          })}
        </g>
      )}
    </Art>
  );
}

/**
 * Thick syrup piles up where the stream landed before it slumps outward: a raised heap on the pool, shaded on its
 * far side, with a fold or two where the ribbon laid over itself.
 */
function Heap({ c, rx, ry, color, u, seed, piece }: { c: Pt; rx: number; ry: number; color: string; u: (n: string) => string; seed: number; piece: boolean }) {
  const rand = rng(seed * 7 + 2);
  const at: Pt = [c[0] - rx * (0.04 + rand() * 0.1), c[1] - ry * (0.1 + rand() * 0.08)];
  const [hx, hy] = [rx * (piece ? 0.5 : 0.42), ry * (piece ? 0.5 : 0.44)];
  const heap = ring(at[0], at[1], hx, hy, seed * 3 + 1, 0.08, 10);
  const hd = smooth(heap, true);
  /** Each fold is where the ribbon slumped over the one below it: an arc round the heap's near side. */
  const fold = (k: number, w: number): Pt[] =>
    Array.from({ length: 7 }, (_, i): Pt => {
      const th = (0.12 + (i / 6) * 0.76) * Math.PI + (rand() - 0.5) * 0.08;
      return [at[0] + Math.cos(th) * hx * w, at[1] - hy * 0.1 + Math.sin(th) * hy * k];
    });
  return (
    <g>
      <path d={hd} transform="translate(1.2 1.8)" fill={mix(color, SHADE, 0.5)} opacity={0.4} filter={`url(#${u("soft")})`} />
      <path d={hd} fill={`url(#${u("top")})`} />
      <path d={hd} transform="translate(-1.4 -1.5)" fill={lighten(color, 0.18)} opacity={0.4} filter={`url(#${u("soft")})`} />
      <g fill="none" strokeLinecap="round" filter={`url(#${u("fine")})`}>
        {[
          [0.45, 0.5],
          [0.8, 0.82],
        ].map(([k, w], i) => {
          const p = smooth(fold(k!, w!), false);
          return (
            <g key={i}>
              <path d={p} transform="translate(0.3 0.9)" stroke={mix(color, SHADE, 0.45)} strokeWidth={1.3} opacity={0.4} />
              <path d={p} stroke={lighten(color, 0.45)} strokeWidth={0.9} opacity={0.6} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

/** A spoon leaves an uneven swirled groove in sauce and cream: a soft shadow under a soft lit line. */
function Folds({ c, rx, ry, color, u, turns, soft = false, seed }: { c: Pt; rx: number; ry: number; color: string; u: (n: string) => string; turns: number; soft?: boolean; seed: number }) {
  const rand = rng(seed * 7 + 1);
  const at: Pt = [c[0] + rx * (rand() * 0.16 - 0.08), c[1] - ry * (0.04 + rand() * 0.1)];
  const p = smooth(swirl(at, rx, ry, turns, rand), false);
  return (
    <g fill="none" strokeLinecap="round" filter={`url(#${u("soft")})`}>
      <path d={p} transform="translate(0.7 1.3)" stroke={mix(color, SHADE, 0.5)} strokeWidth={soft ? 2.4 : 3.2} opacity={soft ? 0.3 : 0.4} />
      <path d={p} stroke={lighten(color, 0.4)} strokeWidth={soft ? 1.6 : 2} opacity={soft ? 0.5 : 0.45} />
    </g>
  );
}

/** Heat ripples across hot oil: a few short, broken, wavering lines of light. */
function Shimmer({ c, rx, ry, color, lines, seed }: { c: Pt; rx: number; ry: number; color: string; lines: number; seed: number }) {
  const rand = rng(seed * 5 + 9);
  return (
    <g fill="none" strokeLinecap="round">
      {Array.from({ length: lines }, (_, i) => {
        const y = c[1] - ry * 0.45 + ((i + 0.3 + rand() * 0.4) / lines) * ry * 1.0;
        const room = rx * Math.sqrt(Math.max(0, 1 - ((y - c[1]) / ry) ** 2)) * 0.8;
        const span = room * (0.35 + rand() * 0.35);
        const mid = c[0] + (rand() * 2 - 1) * (room - span);
        const pts: Pt[] = Array.from({ length: 10 }, (_, j) => {
          const x = mid - span + (j / 9) * span * 2;
          return [x, y + Math.sin(x * 0.8 + i * 1.9) * 0.6];
        });
        const p = smooth(pts, false);
        return (
          <g key={i}>
            <path d={p} transform="translate(0 0.7)" stroke={mix(color, SHADE, 0.35)} strokeWidth={0.5} opacity={0.3} />
            <path d={p} stroke={WHITE} strokeWidth={0.55} opacity={0.45} />
          </g>
        );
      })}
    </g>
  );
}

/** A window's reflection and a pin-point beside it, high on the near side. */
function Glints({ c, rx, ry, gloss, soft, u, piece }: { c: Pt; rx: number; ry: number; gloss: number; soft: boolean; u: (n: string) => string; piece: boolean }) {
  const [x, y] = [c[0] - rx * 0.42, c[1] - ry * 0.34];
  const w = rx * (piece ? 0.2 : 0.14);
  const h = ry * (piece ? 0.12 : 0.1);
  return (
    <g fill={WHITE} opacity={Math.min(1, 0.75 * gloss)} filter={soft ? `url(#${u("soft")})` : undefined}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h * 0.45} transform={`rotate(-14 ${x} ${y})`} />
      <circle cx={x + w * 0.95} cy={y + h * 0.1} r={Math.max(0.45, h * 0.32)} />
    </g>
  );
}
