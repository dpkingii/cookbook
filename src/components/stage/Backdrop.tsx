import { HEX } from "./palette";

export const W = 400;
export const H = 300;
export const HORIZON = 158;

/** White ground and the counter edge: one thin line with a little hand-drawn sag. */
export function Backdrop() {
  return (
    <g aria-hidden>
      <rect width={W} height={H} fill={HEX.white} />
      <path
        d={`M-4 ${HORIZON}C90 ${HORIZON - 4} 210 ${HORIZON + 2} 404 ${HORIZON - 2}`}
        fill="none"
        stroke={HEX.ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}
