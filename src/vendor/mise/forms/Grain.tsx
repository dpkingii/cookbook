import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { lighten, luma, mix, outline, SHADE, WHITE } from "../core/color";
import { smooth, type Pt } from "../core/rough";
import { grainGeometry, type GrainProps, type Item } from "./grain-shape";
import { clamp, grainLook } from "./grain-look";

const f = (n: number) => Math.round(n * 100) / 100;
/** Each grain is drawn in its own frame, centred on the origin, then moved and turned into place. */
const placed = (it: Item) => `translate(${f(it.at[0])} ${f(it.at[1])}) rotate(${Math.round(it.rot)})`;

/** A sesame seed: round at one end, pointed at the other. */
function teardrop(it: Item): Pt[] {
  return Array.from({ length: 10 }, (_, i): Pt => {
    const th = (i / 10) * Math.PI * 2;
    const narrow = 0.45 + 0.55 * ((1 + Math.cos(th)) / 2);
    return [(Math.cos(th) * it.len) / 2, ((Math.sin(th) * it.wid) / 2) * narrow];
  });
}

/** A corn kernel: plump and rounded, its crown a little wider than the blunt end it grew from. */
function kernel(it: Item): Pt[] {
  const [w, l] = [it.wid / 2, it.len / 2];
  return [
    [-w, -l * 0.45],
    [-w * 0.7, -l],
    [w * 0.7, -l],
    [w, -l * 0.45],
    [w * 0.8, l * 0.6],
    [w * 0.3, l],
    [-w * 0.3, l],
    [-w * 0.8, l * 0.6],
  ];
}

/**
 * Rice, lentils, sesame and corn: a heap on the counter made grain by grain, lit from the upper left, with strays
 * round its foot. Or a few loose grains, enlarged. Cooked, rice swells soft and white, lentils darken and split their
 * skins, corn turns juicy; browning toasts them golden, then crisp, then scorched.
 */
export function Grain({ color, shape = "rice", accent, layout = "pile", cooked = false, cookedColor, browning = 0.3, seed = 1, size, title, className }: GrainProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const look = cooked ? grainLook(shape, cookedColor, browning) : null;
  const c = look ? look.cook(color) : color;
  const g = grainGeometry(shape, seed, layout, !!look);
  const few = layout === "piece";
  const zoom = few ? 3 : 1;
  const { cx, cy, rx, ry } = g.base;
  const px = g.peak[0];
  const soft = look && (shape === "rice" || shape === "lentil");
  const inner = accent ?? (shape === "kernel" ? "#f6e8b4" : lighten(color, 0.35));
  const innerCooked = look ? look.cook(inner) : inner;
  const d = g.outline ? smooth(g.outline, true) : "";

  const colorOf = (it: Item) => {
    const side = g.outline ? (it.at[0] - px) / rx : 0;
    const low = g.outline ? clamp((it.at[1] - (cy - ry)) / (ry * 2)) : 0;
    const s = side * 0.45 + low * 0.25 + it.tone * (shape === "rice" ? 0.12 : 0.2);
    return s < 0 ? lighten(c, -s * 0.35) : mix(c, SHADE, s * 0.5);
  };

  const sw = (soft ? 0.2 : 0.28) * zoom;
  /** A stray grain stands alone on the counter, so its own edge has to carry it; heaped grains are carried by the heap's. */
  const draw = (it: Item, i: number, alone = false) => {
    const fill = colorOf(it);
    const edge = alone ? outline(fill, soft ? 0.25 : 0.4) : mix(fill, SHADE, soft ? 0.25 : 0.4);
    const spotted = look && look.browning > 0.15 && it.b < look.browning * (shape === "kernel" ? 0.9 : 0.7);
    const t = placed(it);
    const [hl, hw] = [it.len / 2, it.wid / 2];
    /** An ellipse in the grain's own frame, its numbers rounded: a heap has hundreds of these. */
    const oval = (cx: number, cy: number, rx: number, ry: number, rest: Record<string, string | number>) => <ellipse cx={f(cx)} cy={f(cy)} rx={f(rx)} ry={f(ry)} {...rest} />;
    if (shape === "rice" || shape === "lentil") {
      /** A lentil is a lens tipped at some angle, so it shows as anything from a disc to a sliver. */
      const ry2 = shape === "lentil" ? hw * (0.4 + it.a * 0.6) : hw;
      const split = shape === "lentil" && look && it.a > 0.55;
      return (
        <g key={i} transform={t}>
          {oval(0, 0, hl, ry2, { fill, stroke: edge })}
          {few && shape === "rice" && !look && oval(hl * 0.35, hw * 0.05, hl * 0.3, hw * 0.55, { fill: inner, opacity: 0.55 })}
          {split && oval(hl * 0.22, ry2 * 0.2, hl * 0.68, ry2 * 0.62, { fill: innerCooked, stroke: mix(innerCooked, SHADE, 0.3), strokeWidth: f(sw * 0.6) })}
          {spotted && oval(hl * 0.25, ry2 * 0.3, hl * 0.45, ry2 * 0.5, { fill: look.spot, opacity: f(0.45 + look.browning * 0.4) })}
          {oval(-hl * 0.2, -ry2 * 0.38, hl * 0.5, ry2 * 0.26, { fill: WHITE, opacity: look && shape === "rice" ? 0.55 : 0.4 })}
        </g>
      );
    }
    if (shape === "seed")
      return (
        <g key={i} transform={t}>
          {few ? <path d={smooth(teardrop(it), true)} fill={fill} stroke={edge} /> : oval(0, 0, hl, hw * 0.8, { fill, stroke: edge })}
          {few && <path d={`M${f(-hl * 0.85)} 0H${f(hl * 0.55)}`} stroke={mix(fill, SHADE, 0.3)} strokeWidth={f(0.22 * zoom)} opacity={0.6} />}
          {spotted && oval(hl * 0.2, hw * 0.15, hl * 0.45, hw * 0.4, { fill: look.spot, opacity: f(0.35 + look.browning * 0.35) })}
          {few && oval(hl * 0.15, -hw * 0.3, hl * 0.35, hw * 0.2, { fill: WHITE, opacity: 0.5 })}
        </g>
      );
    return (
      <g key={i} transform={t}>
        <path d={smooth(kernel(it), true)} fill={fill} stroke={edge} />
        {oval(0, hl * 0.68, hw * 0.45, hl * 0.22, { fill: innerCooked, opacity: 0.5 })}
        {spotted && oval(hw * 0.15, -hl * 0.35, hw * 0.5, hl * 0.32, { fill: look.spot, opacity: f(0.5 + look.browning * 0.4) })}
        {oval(-hw * 0.25, -hl * 0.5, hw * 0.3, hl * 0.16, { fill: WHITE, opacity: look ? 0.8 : 0.65 })}
      </g>
    );
  };

  return (
    <Art size={size} title={title} className={className}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation={2.4} />
        </filter>
        <filter id={u("lift")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.5} />
        </filter>
        <linearGradient id={u("side")} gradientUnits="userSpaceOnUse" x1={cx - rx} y1={0} x2={cx + rx} y2={0}>
          {/* What shows between the grains: shade, but not so much that a pale heap goes grey. */}
          <stop offset="0" stopColor={mix(c, SHADE, 0.1 + (1 - luma(c)) * 0.15)} />
          <stop offset="0.45" stopColor={mix(c, SHADE, 0.14 + (1 - luma(c)) * 0.15)} />
          <stop offset="1" stopColor={mix(c, SHADE, 0.34 + (1 - luma(c)) * 0.15)} />
        </linearGradient>
        <clipPath id={u("in")}>
          <path d={d} />
        </clipPath>
      </defs>

      {g.outline && (
        <>
          <ellipse cx={cx + 3} cy={cy + 2} rx={rx * 1.05} ry={ry * 1.15} fill={SHADE} opacity={0.28} filter={`url(#${u("shadow")})`} />
          <path d={d} fill={`url(#${u("side")})`} />
          {/* A rim behind the heap, so its skyline of loose grains still reads against a pale counter. */}
          <path d={d} fill="none" stroke={outline(c, 0.5)} strokeWidth={EDGE * 1.1} strokeLinejoin="round" opacity={luma(c) > 0.7 ? 1 : 0.45} />
          <g strokeWidth={f(sw)} strokeLinejoin="round">{g.items.map((it, i) => draw(it, i))}</g>
          <path d={d} fill="none" stroke={outline(c, 0.5)} strokeWidth={EDGE * 0.6} opacity={luma(c) > 0.7 ? 0.9 : 0.35} clipPath={`url(#${u("in")})`} />
        </>
      )}
      {g.spill.length > 0 && (
        <g fill={SHADE} opacity={few ? 0.28 : 0.3} filter={`url(#${u("lift")})`} transform={`translate(${0.5 * zoom} ${0.7 * zoom})`}>
          {g.spill.map((it, i) =>
            shape === "seed" || shape === "kernel" ? (
              <path key={i} transform={placed(it)} d={smooth(shape === "seed" ? teardrop(it) : kernel(it), true)} />
            ) : (
              <ellipse key={i} transform={placed(it)} rx={f(it.len / 2)} ry={f(shape === "lentil" ? (it.wid / 2) * (0.4 + it.a * 0.6) : it.wid / 2)} />
            ),
          )}
        </g>
      )}
      <g strokeWidth={f(sw)} strokeLinejoin="round">{g.spill.map((it, i) => draw(it, i, true))}</g>
    </Art>
  );
}
