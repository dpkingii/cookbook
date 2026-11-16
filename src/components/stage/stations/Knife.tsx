import { HEX, LINE } from "../palette";

const BLADE = "M0 0Q34 -30 150 -32L150 6L64 6Q22 6 0 0Z";
const HANDLE = "M160 -27L234 -22Q246 -14 236 3L160 5Z";
const SCALE = 0.82;
const CONTACT = { x: 34, y: 4 };

/**
 * Chef's knife, tip at its origin, blade along +x. Placed so the edge touches (x, y)
 * with the handle pointing at `angle` degrees; `lift` raises it off the food and
 * `rock` tips the heel up around the contact point, the way a chef's knife rocks.
 */
export function Knife({ x, y, angle, lift, rock = 0 }: { x: number; y: number; angle: number; lift: number; rock?: number }) {
  return (
    <g aria-hidden transform={`translate(${x.toFixed(1)} ${(y - lift).toFixed(1)}) rotate(${(angle - rock).toFixed(1)}) scale(${SCALE}) translate(${-CONTACT.x} ${-CONTACT.y})`}>
      <path d={BLADE} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main / SCALE} strokeLinejoin="round" />
      <path d="M30 -2Q60 0 150 0" fill="none" stroke={HEX.grey} strokeWidth={LINE.detail / SCALE} />
      <rect x={148} y={-33} width={13} height={40} rx={3} fill={HEX.ink} />
      <path d={HANDLE} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main / SCALE} strokeLinejoin="round" />
      <circle cx={186} cy={-11} r={3.2} fill={HEX.ink} />
      <circle cx={214} cy={-10} r={3.2} fill={HEX.ink} />
    </g>
  );
}
