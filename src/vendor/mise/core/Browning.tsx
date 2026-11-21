import { tint } from "./color";
import type { Box } from "./geometry";

type Ids = (name: string) => string;

/** Filters for browned patches and soft browned edges. `k` is the zoom, so detail stays the same size on screen. */
export function BrownDefs({ u, crust, browning, k = 1, seed, grain = 0.12 }: { u: Ids; crust: string; browning: number; k?: number; seed: number; grain?: number }) {
  return (
    <>
      <filter id={u("brown")} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={grain * k} numOctaves={3} seed={seed + 5} />
        <feColorMatrix type="matrix" values={tint(crust, 1.2 + browning * 2.6, -0.6 - browning * 0.4)} />
      </filter>
      <filter id={u("brownEdge")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={0.9 / k} />
      </filter>
    </>
  );
}

/** Browned patches and darker edges on one piece, kept inside its outline. */
export function Browned({ clip, d, box, crust, browning, u, edge = 2.4 }: { clip: string; d: string; box: Box; crust: string; browning: number; u: Ids; edge?: number }) {
  return (
    <>
      <clipPath id={clip}>
        <path d={d} clipRule="evenodd" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={box.l - 2} y={box.t - 2} width={box.w + 4} height={box.h + 4} filter={`url(#${u("brown")})`} />
        <path d={d} fill="none" stroke={crust} strokeWidth={edge} opacity={0.2 + browning * 0.6} filter={`url(#${u("brownEdge")})`} />
      </g>
    </>
  );
}
