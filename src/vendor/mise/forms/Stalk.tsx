import { useId } from "react";
import { Art, EDGE } from "../core/Art";
import { BrownDefs, Browned } from "../core/Browning";
import { lighten, mix, outline, SHADE, tint, WHITE } from "../core/color";
import { smooth, type Pt } from "../core/rough";
import type { Cut, Layout } from "../core/cut";
import { bbox, centroid, polyPath } from "../core/geometry";
import { frameStalk, type StalkPiece } from "./stalk-cuts";
import { band, BASE, stalkGeometry, type StalkProps, type StalkShape, type Tube } from "./stalk-shape";
import { CHAR, type Look, stalkLook, palette } from "./stalk-look";

/**
 * Scallion, leek, celery or lemongrass lying on the counter, root to the left: pale at the root and green
 * toward the leaves, shaded round like a tube, with veins or ridges running its length.
 */
export function Stalk({ cut = "whole", layout = "pile", cooked = false, cookedColor, browning = 0.3, ...props }: StalkProps) {
  const look = cooked ? stalkLook(cookedColor, browning) : null;
  if (cut !== "whole") return <CutStalk {...props} cut={cut} layout={layout} look={look} />;
  return <WholeStalk {...props} look={look} />;
}

function WholeStalk({
  color,
  base = BASE,
  blush,
  shape = "scallion",
  seed = 1,
  look,
  ...art
}: Omit<StalkProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const g = stalkGeometry(shape, seed, look ? 0.4 + look.browning * 0.6 : 0);
  const pal = palette(shape, base, color, look);
  const sheathColor = mix(pal.skin(0.7), "#b9b386", 0.55);
  const fillOf = (t: Tube) => (t.kind === "stalk" ? pal.skin(0.5) : t.kind === "sheath" ? sheathColor : pal.leaf);
  const xs = g.tubes.flatMap((t) => t.outline.map((p) => p[0]));
  const [l, r] = [Math.min(...xs), Math.max(...xs)];
  const rootColor = mix(base, "#b59a6a", 0.45);

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.35} />
        </filter>
        <filter id={u("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2 0.25" numOctaves={2} seed={seed} />
          <feColorMatrix type="matrix" values={tint(mix(color, SHADE, 0.5), 0.9, -0.42)} />
        </filter>
        <linearGradient id={u("along")} gradientUnits="userSpaceOnUse" x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]}>
          {[0, 0.15, 0.3, 0.45, 0.6, 0.8, 1].map((t) => (
            <stop key={t} offset={t} stopColor={pal.skin(t)} />
          ))}
        </linearGradient>
        {blush && (
          <linearGradient id={u("blush")} gradientUnits="userSpaceOnUse" x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]}>
            <stop offset="0" stopColor={blush} stopOpacity={0.15} />
            <stop offset="0.1" stopColor={blush} stopOpacity={0.55} />
            <stop offset="0.28" stopColor={blush} stopOpacity={0} />
          </linearGradient>
        )}
        {g.tubes.map((t, i) => {
          const [a, b] = [t.spine[0]!, t.spine[t.spine.length - 1]!];
          const c = fillOf(t);
          return (
            <linearGradient key={i} id={u(`t${i}`)} gradientUnits="userSpaceOnUse" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}>
              <stop offset="0" stopColor={t.kind === "leaf" ? lighten(c, 0.08) : c} />
              <stop offset="1" stopColor={t.kind === "sheath" ? mix(c, "#c9bf94", 0.4) : mix(c, SHADE, 0.12)} />
            </linearGradient>
          );
        })}
        {g.tubes.map((t, i) => (
          <clipPath key={i} id={u(`c${i}`)}>
            <path d={smooth(t.outline, true)} />
          </clipPath>
        ))}
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} seed={seed} grain={0.1} />}
      </defs>

      <ellipse cx={(l + r) / 2 + 2} cy={g.bottom + 1} rx={(r - l) * 0.44} ry={3.6} fill={SHADE} opacity={0.26} filter={`url(#${u("shadow")})`} />
      <g fill="none" stroke={rootColor} strokeWidth={0.8} strokeLinecap="round">
        {g.roots.map((rt, i) => (
          <path key={i} d={smooth(rt, false)} />
        ))}
      </g>
      {g.tubes.map((t, i) => {
        const d = smooth(t.outline, true);
        const c = fillOf(t);
        const edge = outline(t.kind === "stalk" ? pal.skin(0.6) : c, 0.55);
        return (
          <g key={i}>
            <path d={d} fill={t.kind === "stalk" ? `url(#${u("along")})` : `url(#${u(`t${i}`)})`} />
            <g clipPath={`url(#${u(`c${i}`)})`}>
              {t.kind === "stalk" && blush && <path d={d} fill={`url(#${u("blush")})`} />}
              <path d={d} filter={`url(#${u("grain")})`} opacity={t.kind === "sheath" ? 0.8 : 0.45} />
              <path d={smooth(band(t.spine, t.widths, -0.75, -0.2), true)} fill={WHITE} opacity={t.kind === "stalk" ? 0.4 : 0.3} filter={`url(#${u("soft")})`} />
              <path d={smooth(band(t.spine, t.widths, 0.3, 1.2), true)} fill={SHADE} opacity={0.26} filter={`url(#${u("soft")})`} />
              <g fill="none" strokeLinecap="round" filter={`url(#${u("fine")})`}>
                {t.veins.map((v, j) => (
                  <path key={j} d={smooth(v, false)} stroke={shape === "celery" && t.kind === "stalk" ? mix(c, SHADE, 0.35) : mix(c, SHADE, 0.25)} strokeWidth={shape === "celery" ? 0.9 : 0.5} opacity={0.6} />
                ))}
                {shape === "celery" &&
                  t.kind === "stalk" &&
                  t.veins.map((v, j) => (
                    <path key={`h${j}`} d={smooth(v.map(([x, y]): Pt => [x, y - 0.9]), false)} stroke={WHITE} strokeWidth={0.7} opacity={0.45} />
                  ))}
              </g>
              {t.fold && (
                <>
                  <path d={smooth(t.fold, false)} fill="none" stroke={mix(c, SHADE, 0.45)} strokeWidth={0.9} opacity={0.7} filter={`url(#${u("fine")})`} />
                  <path d={smooth(t.fold.map(([x, y]): Pt => [x, y - 1]), false)} fill="none" stroke={WHITE} strokeWidth={0.8} opacity={0.35} filter={`url(#${u("fine")})`} />
                </>
              )}
              {look && <Cooked d={d} t={t} u={u} look={look} />}
            </g>
            <path d={d} fill="none" stroke={edge} strokeWidth={t.kind === "stalk" ? EDGE : EDGE * 0.8} strokeLinejoin="round" />
          </g>
        );
      })}
      {g.leaflets.map((lf, i) => {
        const d = smooth(lf.outline, true);
        return (
          <g key={`lf${i}`}>
            <path d={d} fill={mix(pal.leaf, "#3f7d2c", 0.35)} />
            <path d={d} fill={WHITE} opacity={0.12} transform="translate(-0.4 -0.5)" />
            <g fill="none" stroke={mix(pal.leaf, "#d9e8a8", 0.5)} strokeWidth={0.45} opacity={0.7}>
              {lf.veins.map((v, j) => (
                <path key={j} d={smooth(v, false)} />
              ))}
            </g>
            <path d={d} fill="none" stroke={mix(pal.leaf, SHADE, 0.6)} strokeWidth={EDGE * 0.6} strokeLinejoin="round" />
          </g>
        );
      })}
      {g.cap && <RootEnd shape={shape} cap={g.cap} pal={pal} base={base} blush={blush} />}
    </Art>
  );
}

/** Browning and grill marks on a cooked whole stalk, kept inside one tube. */
function Cooked({ d, t, u, look }: { d: string; t: Tube; u: (n: string) => string; look: Look }) {
  const xs = t.outline.map((p) => p[0]);
  const ys = t.outline.map((p) => p[1]);
  const [l, r, top, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const marks = Math.max(0, look.browning - 0.25) * 1.3;
  return (
    <>
      <rect x={l - 2} y={top - 2} width={r - l + 4} height={b - top + 4} filter={`url(#${u("brown")})`} opacity={0.25 + look.browning * 0.6} />
      <path d={d} fill="none" stroke={look.crust} strokeWidth={2.2} opacity={0.15 + look.browning * 0.5} filter={`url(#${u("brownEdge")})`} />
      {marks > 0 && (
        <g stroke={mix(look.crust, CHAR, 0.4)} strokeWidth={2.2} strokeLinecap="round" opacity={Math.min(0.85, marks)} filter={`url(#${u("brownEdge")})`}>
          {Array.from({ length: Math.ceil((r - l) / 11) + 2 }, (_, i) => {
            const x = l - 6 + i * 11;
            return <path key={i} d={`M${x} ${b + 2}L${x + (b - top) * 0.45} ${top - 2}`} />;
          })}
        </g>
      )}
    </>
  );
}

/** The trimmed root end: a leek's root plate, celery's U-shaped base, or lemongrass's tight rings. */
function RootEnd({
  shape,
  cap,
  pal,
  base,
  blush,
}: {
  shape: StalkShape;
  cap: NonNullable<ReturnType<typeof stalkGeometry>["cap"]>;
  pal: ReturnType<typeof palette>;
  base: string;
  blush?: string;
}) {
  const [x, y] = cap.at;
  const face = pal.section(0);
  const ring = mix(pal.skin(0.1), SHADE, 0.3);
  const edge = outline(pal.skin(0), 0.55);
  return (
    <g transform={`rotate(${cap.deg} ${x} ${y})`}>
      {shape === "leek" ? (
        <>
          <ellipse cx={x} cy={y} rx={cap.rx} ry={cap.ry} fill={mix(base, "#b9a170", 0.5)} stroke={edge} strokeWidth={EDGE * 0.7} />
          <ellipse cx={x - 0.4} cy={y} rx={cap.rx * 0.55} ry={cap.ry * 0.6} fill={mix(base, "#8f7a52", 0.5)} opacity={0.7} />
        </>
      ) : (
        <>
          <ellipse cx={x} cy={y} rx={cap.rx} ry={cap.ry} fill={face} stroke={edge} strokeWidth={EDGE * 0.7} />
          {shape === "celery" ? (
            <path
              d={`M${x - 0.3} ${y - cap.ry * 0.62}Q${x + cap.rx * 0.9} ${y} ${x - 0.3} ${y + cap.ry * 0.62}`}
              fill="none"
              stroke={ring}
              strokeWidth={0.6}
              opacity={0.8}
            />
          ) : (
            [0.72, 0.48, 0.26].map((k) => (
              <ellipse key={k} cx={x} cy={y} rx={cap.rx * k} ry={cap.ry * k} fill="none" stroke={blush ? mix(blush, ring, 0.4) : ring} strokeWidth={0.4} opacity={0.75} />
            ))
          )}
        </>
      )}
    </g>
  );
}


function CutStalk({
  color,
  base = BASE,
  blush,
  shape = "scallion",
  seed = 1,
  cut,
  layout,
  look,
  ...art
}: Omit<StalkProps, "cut" | "layout" | "cooked" | "cookedColor" | "browning"> & { cut: Exclude<Cut, "whole">; layout: Layout; look: Look | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const u = (name: string) => `${id}-${name}`;
  const pal = palette(shape, base, color, look);
  const { result, pieces: shown, fit, k } = frameStalk(shape, cut, seed, layout, !!look);
  const order = [...shown].sort((a, b) => bbox(a.outer).b - bbox(b.outer).b);
  const heap = result.heap && layout === "pile";
  /** A blush near the root tints the pale pieces, as on lemongrass. */
  const tinted = (c: string, t: number) => (blush && t < 0.3 ? mix(c, blush, 0.3 * (1 - t / 0.3)) : c);
  const faceOf = (p: StalkPiece, t: number) => tinted(p.face === "section" ? pal.section(t) : pal.skin(t), t);
  const sizeOf = (p: StalkPiece) => {
    const b = bbox(p.outer);
    return Math.sqrt(b.w * b.h);
  };
  const edgeOf = (p: StalkPiece) => (EDGE / k) * Math.min(1, sizeOf(p) / 14);

  return (
    <Art {...art}>
      <defs>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.4 / k} />
        </filter>
        <filter id={u("fine")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.3 / k} />
        </filter>
        <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.7 / k} />
        </filter>
        <radialGradient id={u("wet")} cx="0.32" cy="0.3" r="0.5">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.6} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {shown.map((p, i) =>
          p.axis && p.toneTo !== undefined ? (
            <linearGradient key={i} id={u(`g${i}`)} gradientUnits="userSpaceOnUse" x1={p.axis[0][0]} y1={p.axis[0][1]} x2={p.axis[1][0]} y2={p.axis[1][1]}>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <stop key={f} offset={f} stopColor={faceOf(p, p.tone + (p.toneTo! - p.tone) * f)} />
              ))}
            </linearGradient>
          ) : null,
        )}
        {look && <BrownDefs u={u} crust={look.crust} browning={look.browning} k={k} seed={seed} grain={0.16} />}
      </defs>
      <g transform={`translate(${50 - fit.cx * k} ${50 - fit.cy * k}) scale(${k})`}>
        {heap && (
          <ellipse cx={fit.cx + 2} cy={fit.b - 2} rx={fit.w * 0.48} ry={Math.max(3, fit.h * 0.15)} fill={SHADE} opacity={0.2} filter={`url(#${u("shadow")})`} />
        )}
        {order.map((p) => {
          const i = shown.indexOf(p);
          const d = p.hole ? polyPath(p.outer) + polyPath(p.hole) : polyPath(p.outer);
          const down = (dy: number, pts: Pt[]) => polyPath(pts.map(([x, y]): Pt => [x, y + dy]));
          const layers = Math.max(1, Math.round(p.thick * k));
          const skin = tinted(pal.skin(p.tone), p.tone);
          const face = faceOf(p, p.tone);
          const fill = p.axis && p.toneTo !== undefined ? `url(#${u(`g${i}`)})` : face;
          const side = p.face === "section" ? mix(skin, SHADE, 0.08) : mix(skin, SHADE, 0.22);
          const edge = outline(look ? mix(skin, look.crust, 0.3) : skin, sizeOf(p) < 8 ? 0.4 : 0.55);
          const small = sizeOf(p) < 6;
          /** Layer lines darker than both the pale face and the skin, so they show on white leek too. */
          const layerLine = mix(mix(face, skin, 0.5), SHADE, 0.2);
          return (
            <g key={i}>
              {!heap && <path d={down(p.thick + (result.heap ? 1 : 2.5), p.outer)} transform="translate(2 0)" fill={SHADE} opacity={0.24} filter={`url(#${u("shadow")})`} />}
              {Array.from({ length: layers }, (_, j) => p.thick * (1 - j / layers)).map((dy) => (
                <path key={dy} d={p.hole ? down(dy, p.outer) + down(dy, p.hole) : down(dy, p.outer)} fillRule="evenodd" fill={side} />
              ))}
              <path d={p.hole ? down(p.thick, p.outer) + down(p.thick, p.hole) : down(p.thick, p.outer)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
              <path d={d} fillRule="evenodd" fill={fill} />
              {p.shade && <path d={polyPath(p.shade)} fill={SHADE} opacity={0.22} filter={`url(#${u("soft")})`} />}
              {p.shine && <path d={polyPath(p.shine)} fill={WHITE} opacity={look ? 0.18 : 0.4} filter={`url(#${u("soft")})`} />}
              {p.rings?.map((r, j) => (
                <path key={j} d={polyPath(r)} fill="none" stroke={layerLine} strokeWidth={small ? 0.25 : 0.45} opacity={0.8} />
              ))}
              {p.lines?.map((l, j) => (
                <path
                  key={`l${j}`}
                  d={smooth(l, false)}
                  fill="none"
                  stroke={p.face === "section" ? layerLine : mix(skin, SHADE, shape === "celery" ? 0.3 : 0.2)}
                  strokeWidth={small ? 0.25 : shape === "celery" && p.face === "skin" ? 0.7 : 0.45}
                  strokeLinecap="round"
                  opacity={0.7}
                />
              ))}
              {p.dots && (
                <g fill={mix(skin, SHADE, 0.15)} opacity={0.8}>
                  {p.dots.map(([x, y], j) => (
                    <circle key={j} cx={x} cy={y} r={0.5} />
                  ))}
                </g>
              )}
              {p.cap && <path d={polyPath(p.cap)} fill={p.face === "section" ? mix(face, "#b9a170", 0.35) : tinted(pal.section(p.tone), p.tone)} stroke={edge} strokeWidth={edgeOf(p) * 0.6} />}
              {look && (
                <g opacity={0.2 + look.browning * 0.7}>
                  <Browned clip={u(`b${i}`)} d={d} box={bbox(p.outer)} crust={look.crust} browning={look.browning} u={u} edge={heap ? 0.8 : 1.6} />
                </g>
              )}
              <path d={d} fillRule="evenodd" fill={`url(#${u("wet")})`} opacity={look ? 0.3 * (1 - look.browning) : 0.8} />
              {p.face === "section" && !small && <path d={polyPath(p.outer)} fill="none" stroke={skin} strokeWidth={Math.min(1.1, sizeOf(p) * 0.09)} strokeLinejoin="round" />}
              {p.hole && <path d={polyPath(p.hole)} fill="none" stroke={mix(face, SHADE, 0.3)} strokeWidth={0.4} />}
              <path d={polyPath(p.outer)} fill="none" stroke={edge} strokeWidth={edgeOf(p)} strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </Art>
  );
}
