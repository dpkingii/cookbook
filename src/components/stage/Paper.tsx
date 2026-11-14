import { HEX, INK } from "./palette";

export const W = 400;
export const H = 300;
export const HORIZON = 158;

/**
 * Paper grain as an image rather than a live filter: the browser rasterises it once,
 * so the looping animations underneath don't re-run turbulence every frame.
 */
const GRAIN = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><filter id="n" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.12 0 0 0 0 0.14 0 0 0 0 0.19 3.2 0 0 0 -1.75"/></filter><rect width="400" height="300" filter="url(#n)"/></svg>`,
)}`;

export function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`${uid}-dots`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
        <circle cx={3} cy={3} r={1.15} fill={HEX.ink} />
      </pattern>
      <pattern id={`${uid}-paperdots`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
        <circle cx={2.5} cy={2.5} r={1.05} fill={HEX.paper} />
      </pattern>
    </defs>
  );
}

export function Backdrop({ uid }: { uid: string }) {
  return (
    <g aria-hidden>
      <rect width={W} height={H} fill={INK.paper} />
      <path
        d={`M-4 ${HORIZON + 2}C90 ${HORIZON - 3} 210 ${HORIZON + 4} 404 ${HORIZON - 1}V304H-4Z`}
        fill={INK.paperDeep}
      />
      <path
        d={`M-4 ${HORIZON + 2}C90 ${HORIZON - 3} 210 ${HORIZON + 4} 404 ${HORIZON - 1}V304H-4Z`}
        fill={`url(#${uid}-dots)`}
        opacity={0.09}
      />
      <path
        d={`M-4 ${HORIZON}C90 ${HORIZON - 5} 210 ${HORIZON + 2} 404 ${HORIZON - 3}`}
        fill="none"
        stroke={INK.ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

export function Grain() {
  return (
    <image
      aria-hidden
      href={GRAIN}
      width={W}
      height={H}
      opacity={0.32}
      preserveAspectRatio="none"
      style={{ pointerEvents: "none" }}
    />
  );
}
