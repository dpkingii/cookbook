import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, luma, mix, outline, SHADE, WHITE } from "../core/color";
import { area, bbox, inside, polyPath, scaleAbout, type Box } from "../core/geometry";
import { rng, smooth, type Pt } from "../core/rough";
import { frameEgg, type EggPiece } from "./egg-cuts";
import { eggPalette, type EggPalette } from "./egg-look";
import { beatenGeometry, crackedGeometry, omeletteGeometry, SHELL, shellGeometry, type EggProps } from "./egg-shape";

/** An egg in its shell, cracked (or fried), beaten (or set into curds, ribbons and omelette), or boiled and cut. */
export function Egg({ color = SHELL, yolk, state = "shell", soft = false, cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.3, seed = 1, ...art }: EggProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = eggPalette(state, yolk, soft, cooked, cookedColor, browning);
  const whole = cut === "whole" || state === "cracked";

  if (whole) {
    return (
      <Art {...art}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} />
        </defs>
        {state === "cracked" ? (
          <Cracked u={u} pal={pal} seed={seed} cooked={cooked} />
        ) : state === "beaten" ? (
          cooked ? (
            <Omelette u={u} pal={pal} seed={seed} />
          ) : (
            <Beaten u={u} pal={pal} seed={seed} />
          )
        ) : (
          <Whole u={u} pal={pal} seed={seed} shell={state === "shell" ? color : null} />
        )}
      </Art>
    );
  }

  const { result, pieces, fit, k } = frameEgg(state, cut as Exclude<typeof cut, "whole">, seed, layout, soft);
  const heap = result.heap && layout === "pile";
  return (
    <Art {...art}>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        <defs>
          <Defs u={u} pal={pal} seed={seed} k={k} />
        </defs>
        {heap && <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.46} ry={Math.max(3, fit.h * 0.14)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />}
        {pieces.map((p, i) => (
          <Piece key={i} p={p} i={i} u={u} pal={pal} k={k} soft={soft} cooked={cooked} shadow={!heap} many={pieces.length > 40} crumb={state === "beaten" ? pal.curd : pal.yolk} />
        ))}
      </g>
    </Art>
  );
}

type Ids = (n: string) => string;

const perimeter = (pts: Pt[]) => pts.reduce((s, q, i) => s + Math.hypot(q[0] - pts[(i + 1) % pts.length]![0], q[1] - pts[(i + 1) % pts.length]![1]), 0);

function freckles(seed: number, b: Box): [number, number, number][] {
  const rand = rng(seed * 5 + 3);
  return Array.from({ length: 9 }, () => [b.l + b.w * (0.15 + rand() * 0.7), b.t + b.h * (0.2 + rand() * 0.6), 2 + rand() * 3]);
}

function Defs({ u, pal, seed, k = 1 }: { u: Ids; pal: EggPalette; seed: number; k?: number }) {
  return (
    <>
      <radialGradient id={u("dome")} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.55} />
        <stop offset="0.45" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.28} />
      </radialGradient>
      <radialGradient id={u("yolk")} cx="0.38" cy="0.32" r="0.75">
        <stop offset="0" stopColor={lighten(pal.yolk, 0.3)} />
        <stop offset="0.6" stopColor={pal.yolk} />
        <stop offset="1" stopColor={mix(pal.yolk, "#c45a08", 0.35)} />
      </radialGradient>
      <linearGradient id={u("sheen")} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor={WHITE} stopOpacity={0.35} />
        <stop offset="0.55" stopColor={WHITE} stopOpacity={0} />
        <stop offset="1" stopColor={SHADE} stopOpacity={0.18} />
      </linearGradient>
      <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={2.4 / k} />
      </filter>
      <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={1.2 / k} />
      </filter>
      {pal.browning > 0 && <BrownDefs u={u} crust={pal.crust} browning={pal.browning} k={k} seed={seed} grain={0.16} />}
    </>
  );
}

/** A whole egg in its shell, speckled if brown, or a peeled boiled egg, glossy white. */
function Whole({ u, pal, seed, shell }: { u: Ids; pal: EggPalette; seed: number; shell: string | null }) {
  const { outline: o } = shellGeometry(seed);
  const d = smooth(o, true);
  const b = bbox(o);
  const fill = shell ?? pal.white;
  const rand = rng(seed * 7 + 3);
  /** Brown shells carry faint darker speckles; white ones and peeled eggs are clean. */
  const speckles = shell && luma(shell) < 0.8
    ? Array.from({ length: 40 }, () => [b.l + 6 + rand() * (b.w - 12), b.t + 6 + rand() * (b.h - 12), 0.5 + rand() * 0.8] as const).filter(([x, y]) => inside([x, y], scaleAbout(o, 0.9)))
    : [];
  return (
    <>
      <ellipse cx={(b.l + b.r) / 2 + 3} cy={b.b - 2} rx={b.w * 0.4} ry={4.5} fill={SHADE} opacity={0.26} filter={`url(#${u("shadow")})`} />
      <path d={d} fill={fill} />
      {speckles.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={mix(fill, SHADE, 0.35)} opacity={0.5} />
      ))}
      <path d={d} fill={`url(#${u("dome")})`} />
      <ellipse cx={b.l + b.w * 0.36} cy={b.t + b.h * 0.26} rx={b.w * 0.12} ry={b.h * 0.07} fill={WHITE} opacity={shell ? 0.4 : 0.75} transform={`rotate(-20 ${b.l + b.w * 0.36} ${b.t + b.h * 0.26})`} />
      <path d={d} fill="none" stroke={outline(fill, 0.5)} strokeWidth={EDGE} strokeLinejoin="round" />
    </>
  );
}

/** A cracked egg: clear raw white round a domed yolk; cooked, an opaque fried white with lacy browned edges. */
function Cracked({ u, pal, seed, cooked }: { u: Ids; pal: EggPalette; seed: number; cooked: boolean }) {
  const g = crackedGeometry(seed);
  const wd = smooth(g.white, true);
  const td = smooth(g.thick, true);
  const yd = smooth(g.yolk, true);
  const b = bbox(g.white);
  const rawEdge = "#b9b29c";
  return (
    <>
      <ellipse cx={50 + 2} cy={b.b - 3} rx={b.w * 0.44} ry={4} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />
      {cooked ? (
        <>
          <path d={wd} fill={pal.white} />
          {pal.browning > 0.1 && (
            /** Only the thin edge of a fried white crisps: a lacy brown rim fading inward. */
            <>
              <mask id={u("rim")} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                <path d={wd} fill="none" stroke={WHITE} strokeWidth={6 + pal.browning * 10} filter={`url(#${u("soft")})`} />
              </mask>
              <clipPath id={u("bw")}>
                <path d={wd} />
              </clipPath>
              <g clipPath={`url(#${u("bw")})`} mask={`url(#${u("rim")})`}>
                <rect x={b.l} y={b.t} width={b.w} height={b.h} filter={`url(#${u("brown")})`} />
                <path d={wd} fill="none" stroke={pal.crust} strokeWidth={2 + pal.browning * 3} opacity={0.35 + pal.browning * 0.4} filter={`url(#${u("soft")})`} />
              </g>
            </>
          )}
          <path d={td} fill={WHITE} opacity={0.6} filter={`url(#${u("soft")})`} />
          <path d={wd} fill="none" stroke={outline(mix(pal.white, pal.crust, pal.browning * 0.6), 0.45)} strokeWidth={EDGE} strokeLinejoin="round" />
        </>
      ) : (
        <>
          {/* Raw white is clear: the counter shows through, with a glossy rim and a thicker, cloudier middle. */}
          <path d={wd} fill="#eef0e6" opacity={0.6} />
          <path d={td} fill="#f6f6ee" opacity={0.75} />
          <path d={wd} fill="none" stroke={rawEdge} strokeWidth={EDGE * 0.8} strokeLinejoin="round" />
          <path d={smooth(g.white.slice(4, 18), false)} fill="none" stroke={WHITE} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        </>
      )}
      <ellipse cx={g.yolkAt[0] + 2} cy={g.yolkAt[1] + g.yolkR * 0.8} rx={g.yolkR * 0.9} ry={g.yolkR * 0.3} fill={SHADE} opacity={0.18} filter={`url(#${u("soft")})`} />
      <path d={yd} fill={`url(#${u("yolk")})`} />
      <ellipse cx={g.yolkAt[0] - g.yolkR * 0.35} cy={g.yolkAt[1] - g.yolkR * 0.4} rx={g.yolkR * 0.28} ry={g.yolkR * 0.16} fill={WHITE} opacity={cooked ? 0.5 : 0.85} transform={`rotate(-25 ${g.yolkAt[0] - g.yolkR * 0.35} ${g.yolkAt[1] - g.yolkR * 0.4})`} />
      <path d={yd} fill="none" stroke={outline(pal.yolk, 0.45)} strokeWidth={EDGE * 0.8} />
    </>
  );
}

/** Beaten egg poured out: deep yellow, streaked with paler white not quite whisked in, a few bubbles at the edge. */
function Beaten({ u, pal, seed }: { u: Ids; pal: EggPalette; seed: number }) {
  const g = beatenGeometry(seed);
  const d = smooth(g.pool, true);
  const b = bbox(g.pool);
  const rand = rng(seed * 11 + 5);
  return (
    <>
      <ellipse cx={52} cy={b.b - 3} rx={b.w * 0.44} ry={4} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />
      <path d={d} fill={pal.beaten} />
      {g.streaks.map((s, i) => (
        <path key={i} d={smooth(s, false)} fill="none" stroke={lighten(pal.beaten, 0.5)} strokeWidth={2.2 - (i % 3) * 0.5} strokeLinecap="round" opacity={0.75} />
      ))}
      <path d={d} fill={`url(#${u("sheen")})`} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = rand() * 6.28;
        return <circle key={i} cx={50 + Math.cos(a) * 34} cy={52 + Math.sin(a) * 25} r={0.8 + rand() * 1.2} fill="none" stroke={WHITE} strokeWidth={0.6} opacity={0.85} />;
      })}
      <path d={d} fill="none" stroke={outline(pal.beaten, 0.45)} strokeWidth={EDGE} strokeLinejoin="round" />
    </>
  );
}

/** A folded omelette: golden, freckled brown where it met the pan, with the soft line of its fold. */
function Omelette({ u, pal, seed }: { u: Ids; pal: EggPalette; seed: number }) {
  const g = omeletteGeometry(seed);
  const d = smooth(g.outline, true);
  const b = bbox(g.outline);
  return (
    <>
      <ellipse cx={52} cy={b.b - 1} rx={b.w * 0.46} ry={4} fill={SHADE} opacity={0.22} filter={`url(#${u("shadow")})`} />
      <path d={d} fill={pal.beaten} />
      {/* A few soft golden freckles where it touched the pan, not an all-over crust. */}
      {pal.browning > 0.1 && (
        <>
          <clipPath id={u("om")}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${u("om")})`} filter={`url(#${u("soft")})`} opacity={0.25 + pal.browning * 0.45}>
            {freckles(seed, b).map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx={r * 1.4} ry={r} fill={pal.crust} opacity={0.5} />
            ))}
          </g>
        </>
      )}
      <path d={d} fill={`url(#${u("sheen")})`} />
      <path d={smooth(g.fold, false)} fill="none" stroke={mix(pal.beaten, SHADE, 0.3)} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      <path d={d} fill="none" stroke={outline(pal.beaten, 0.45)} strokeWidth={EDGE} strokeLinejoin="round" />
    </>
  );
}

function Piece({ p, i, u, pal, k, soft, cooked, shadow, many, crumb }: { p: EggPiece; i: number; u: Ids; pal: EggPalette; k: number; soft: boolean; cooked: boolean; shadow: boolean; many: boolean; crumb: string }) {
  const d = polyPath(p.outer);
  const box = bbox(p.outer);
  /** How wide the piece is across, so a thin ribbon gets a thin edge. */
  const size = Math.min(Math.sqrt(box.w * box.h), (4 * Math.abs(area(p.outer))) / Math.max(1, perimeter(p.outer)));
  const edgeW = ((EDGE * 0.7) / k) * Math.min(1, size / 6) + 0.15 / k;
  /** Crumbs of chopped boiled egg are white or yolk; fine bits of fried-rice egg are all set beaten egg. */
  const face = p.kind === "boiled" ? pal.white : p.kind === "bit" ? (p.yolky ? crumb : pal.white) : pal.curd;
  const down = (dy: number) => polyPath(p.outer.map(([x, y]): Pt => [x, y + dy]));
  const layers = p.thick * k > 1 ? Math.min(8, Math.round(p.thick * k)) : 0;
  return (
    <g>
      {shadow && <path d={down(p.thick + 1.5)} fill={SHADE} opacity={0.18} filter={`url(#${u("shadow")})`} />}
      {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
        <path key={dy} d={down(dy)} fill={mix(face, SHADE, 0.16)} />
      ))}
      <path d={d} fill={face} />
      {p.yolk && (
        <>
          <path d={smooth(p.yolk, true)} fill={soft ? `url(#${u("yolk")})` : pal.yolk} />
          {!soft && <path d={smooth(p.yolk, true)} fill="none" stroke={mix(pal.yolk, SHADE, 0.15)} strokeWidth={0.5 / k} />}
          {soft && <path d={smooth(p.yolk, true)} fill="none" stroke={mix(pal.yolk, "#b8500a", 0.4)} strokeWidth={0.6 / k} />}
        </>
      )}
      {p.fold && <path d={smooth(p.fold, false)} fill="none" stroke={mix(face, SHADE, 0.32)} strokeWidth={1 / Math.max(1, k * 0.5)} strokeLinecap="round" opacity={0.7} />}
      {!many && <path d={d} fill={`url(#${u("sheen")})`} />}
      {/* Just-set egg is still wet and glossy. */}
      {!cooked && (p.kind === "curd" || p.kind === "ribbon") && <path d={d} fill="none" stroke={WHITE} strokeWidth={0.8 / k} opacity={0.6} />}
      <path d={d} fill="none" stroke={outline(mix(face, SHADE, 0.25), 0.45)} strokeWidth={edgeW} strokeLinejoin="round" />
    </g>
  );
}

