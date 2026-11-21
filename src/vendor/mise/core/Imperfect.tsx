import { tint, WHITE } from "./color";
import { bbox, inside } from "./geometry";
import type { Pt } from "./rough";

/**
 * Math curves and smooth gradients look like plastic toys. These add the small, irregular things real food has:
 * a ragged edge where it was seared, a fine grain of cells in cut flesh, and pin-points of light on anything wet.
 */

type Ids = (name: string) => string;

/**
 * `rough` frays whatever it is put on: its outline wanders by about `amount` box units, the way a seared crust or torn
 * crumb does. `cells` is a fine speckle of cells for cut flesh. `k` is the zoom, so both stay the same size on screen.
 */
export function ImperfectDefs({ u, k = 1, seed, amount = 1.2, cells }: { u: Ids; k?: number; seed: number; amount?: number; cells?: string }) {
  return (
    <>
      <filter id={u("rough")} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency={0.32 * k} numOctaves={2} seed={seed + 21} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={amount / k} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {cells && (
        <filter id={u("cells")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={1.1 * k} numOctaves={2} seed={seed + 13} />
          <feColorMatrix type="matrix" values={tint(cells, 2.4, -1.25)} />
        </filter>
      )}
    </>
  );
}

/** `count` points inside the polygon, kept off its edge, deterministic for `rand`. */
export function sprinkle(poly: Pt[], count: number, rand: () => number, inset = 0.15): Pt[] {
  const b = bbox(poly);
  const out: Pt[] = [];
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const p: Pt = [b.l + b.w * (inset + rand() * (1 - inset * 2)), b.t + b.h * (inset + rand() * (1 - inset * 2))];
    if (inside(p, poly)) out.push(p);
  }
  return out;
}

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * Pin-points of light on a wet surface: seeds, gel, juice, a freshly cut face. `stretch` draws them as short slivers
 * tipped toward the light, which read as wet; round dots read as polka dots.
 */
export function Glints({ at, r, opacity = 0.85, stretch = 1 }: { at: Pt[]; r: number | number[]; opacity?: number; stretch?: number }) {
  return (
    <g fill={WHITE} opacity={opacity}>
      {at.map(([x, y], i) => {
        const rr = Array.isArray(r) ? r[i % r.length]! : r;
        return stretch === 1 ? (
          <circle key={i} cx={f(x)} cy={f(y)} r={f(rr)} />
        ) : (
          <ellipse key={i} cx={f(x)} cy={f(y)} rx={f(rr * stretch)} ry={f(rr)} transform={`rotate(-35 ${f(x)} ${f(y)})`} />
        );
      })}
    </g>
  );
}
