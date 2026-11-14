import { INK, MIS } from "../palette";

const BLADE = "M0 0Q34 -30 150 -32L150 6L64 6Q22 6 0 0Z";
const HANDLE = "M160 -27L234 -22Q246 -14 236 3L160 5Z";
const SCALE = 0.82;
const CONTACT = { x: 34, y: 4 };

/**
 * Chef's knife, tip at its origin, blade along +x. Placed so the edge touches (x, y)
 * with the handle pointing at `angle` degrees; `lift` raises it off the food.
 */
export function Knife({ x, y, angle, lift }: { x: number; y: number; angle: number; lift: number }) {
  return (
    <g aria-hidden transform={`translate(${x.toFixed(1)} ${(y - lift).toFixed(1)}) rotate(${angle}) scale(${SCALE}) translate(${-CONTACT.x} ${-CONTACT.y})`}>
      <path d={BLADE} fill={INK.paper} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d="M30 -2Q60 0 150 0" fill="none" stroke={INK.inkSoft} strokeWidth={2} />
      <path d="M60 -20Q100 -24 140 -24" fill="none" stroke={INK.paperDeep} strokeWidth={3} strokeLinecap="round" />
      <path d={BLADE} fill="none" stroke={INK.ink} strokeWidth={3.6} strokeLinejoin="round" />
      <rect x={148} y={-33} width={13} height={40} rx={3} fill={INK.ink} />
      <path d={HANDLE} fill={INK.tomato} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={HANDLE} fill="none" stroke={INK.ink} strokeWidth={3.6} strokeLinejoin="round" />
      <circle cx={186} cy={-11} r={3.2} fill={INK.ink} />
      <circle cx={214} cy={-10} r={3.2} fill={INK.ink} />
    </g>
  );
}
