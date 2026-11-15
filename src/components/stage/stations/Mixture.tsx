import type { Item } from "../contents";
import { placements } from "../food";
import { HEX, INK, mix } from "../palette";
import { blob, rng, seedOf, smooth, type Pt } from "../rough";

export interface Surface {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Draw in a circle of radius rx, squashed onto the surface ellipse and turned by `deg`. */
const onSurface = (f: Surface, deg: number) =>
  `translate(${f.cx} ${f.cy}) scale(1 ${(f.ry / f.rx).toFixed(3)}) rotate(${deg.toFixed(1)})`;

function arc(r: number, a0: number, span: number): string {
  const x0 = r * Math.cos(a0);
  const y0 = r * Math.sin(a0);
  const x1 = r * Math.cos(a0 + span);
  const y1 = r * Math.sin(a0 + span);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** Streaks of each ingredient's colour dragged round by the whisk, fading into the mix. */
export function Swirl({ f, items, blend, final, deg }: { f: Surface; items: Item[]; blend: number; final: string; deg: number }) {
  const streaks = items.slice(0, 6);
  const width = 3 + (1 - blend) * 6;
  return (
    <g transform={onSurface(f, deg)}>
      {streaks.map((it, k) => {
        const r = f.rx * (0.28 + (k / Math.max(1, streaks.length)) * 0.6);
        return (
          <path
            key={it.ingredient.id}
            d={arc(r, k * 2.1, 2.4 + (k % 2) * 0.8)}
            fill="none"
            stroke={mix(it.ingredient.token.color, final, blend * 0.8)}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={1 - blend * 0.75}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {[0.42, 0.7].map((r, i) => (
        <path
          key={r}
          d={arc(f.rx * r, i * Math.PI + 0.4, 2.2)}
          fill="none"
          stroke={mix(final, HEX.paper, 0.45)}
          strokeWidth={2.4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={arc(f.rx * 0.16, 0, 4.4)} fill="none" stroke={INK.ink} strokeWidth={2} strokeLinecap="round" opacity={0.55} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/** Each ingredient sitting in its own patch before it is worked in; yolks stay yolks. */
export function Patches({ f, items, blend, final }: { f: Surface; items: Item[]; blend: number; final: string }) {
  if (blend >= 0.98) return null;
  const k = 1 - blend * 0.85;
  return (
    <g opacity={Math.min(1, (1 - blend) * 1.6)}>
      {items.map((it, i) => {
        const [spot] = placements(it.ingredient.id + "patch", 1, f.cx, f.cy, f.rx * 0.55, f.ry * 0.5);
        const yolk = it.ingredient.token.shape === "round";
        const big = it.ingredient.token.shape === "grain" ? 0.45 : 1;
        const color = mix(it.ingredient.token.color, final, blend * 0.7);
        const count = yolk ? 2 : 1;
        return Array.from({ length: count }, (_, j) => {
          const x = spot.x + j * 30 - (count - 1) * 15;
          const rx = (yolk ? 15 : 30) * big * k;
          const ry = (yolk ? 9 : 10) * big * k;
          const d = blob(x, spot.y + j * 3, rx, ry, spot.seed + j, yolk ? 0.05 : 0.18, 8);
          return (
            <g key={`${i}-${j}`}>
              <path d={d} fill={color} />
              <path d={d} fill="none" stroke={INK.ink} strokeWidth={yolk ? 2.2 : 1.6} opacity={yolk ? 1 : 0.6} />
              {yolk && (
                <path d={`M${x - rx * 0.45} ${spot.y - ry * 0.1}q${rx * 0.2} ${-ry * 0.5} ${rx * 0.55} ${-ry * 0.45}`} fill="none" stroke={INK.paper} strokeWidth={2} strokeLinecap="round" />
              )}
            </g>
          );
        });
      })}
    </g>
  );
}

/** Spices and starches as specks that dissolve as the mix comes together. */
export function Specks({ f, items, blend }: { f: Surface; items: Item[]; blend: number }) {
  const n = Math.round(9 * (1 - blend * 0.8));
  return (
    <g>
      {items.flatMap((it) =>
        placements(it.ingredient.id + "speck", n, f.cx, f.cy, f.rx * 0.8, f.ry * 0.7).map((p) => (
          <rect
            key={p.seed}
            x={p.x - 1.6}
            y={p.y - 1.6}
            width={3.2}
            height={3.2}
            rx={0.5}
            fill={it.ingredient.token.color}
            stroke={INK.ink}
            strokeWidth={0.9}
            transform={`rotate(${p.seed % 90} ${p.x} ${p.y})`}
          />
        )),
      )}
    </g>
  );
}

/** Ribbons of the folded-in colour through the base, thinning as the fold goes on. */
export function Marble({ f, color, final, p, deg, id }: { f: Surface; color: string; final: string; p: number; deg: number; id: string }) {
  const rand = rng(seedOf(id + "marble"));
  const n = 2 + Math.round(p * 3);
  const ribbons: string[] = [];
  for (let i = 0; i < n; i++) {
    const tilt = (i / n) * Math.PI + rand() * 0.4;
    const off = (rand() - 0.5) * f.rx * 0.5;
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = -1 + k / 3;
      const along = u * f.rx * 0.95;
      const across = off + Math.sin(u * Math.PI * (0.6 + p * 0.7) + i) * f.rx * 0.2;
      pts.push([along * Math.cos(tilt) - across * Math.sin(tilt), along * Math.sin(tilt) + across * Math.cos(tilt)]);
    }
    ribbons.push(smooth(pts, false));
  }
  const ink = mix(color, final, p * 0.55);
  const width = 13 - p * 8;
  return (
    <g transform={onSurface(f, deg)}>
      {ribbons.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={ink} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={d} fill="none" stroke={mix(ink, HEX.paper, 0.35)} strokeWidth={width * 0.3} strokeLinecap="round" strokeDasharray="14 9" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </g>
  );
}
