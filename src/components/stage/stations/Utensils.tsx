import { INK, MIS } from "../palette";

const WIRES = [26, 17, 8].map(
  (w) => `M0 -78C${-w} -60 ${-w * 1.05} -14 0 0C${w * 1.05} -14 ${w} -60 0 -78`,
);
const WHISK_HANDLE = "M-6 -84L-7 -128Q0 -135 7 -128L6 -84Z";

/** Balloon whisk, tip of the wires at its origin, handle leaning `angle` degrees off upright. */
export function Whisk({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g aria-hidden transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(1.3)`}>
      {WIRES.map((d) => (
        <path key={d} d={d} fill="none" stroke={INK.ink} strokeWidth={2.6} strokeLinejoin="round" />
      ))}
      <path d="M0 -78V-6" stroke={INK.ink} strokeWidth={2} />
      <rect x={-7.5} y={-90} width={15} height={10} rx={2} fill={INK.paperDeep} stroke={INK.ink} strokeWidth={2.6} />
      <path d={WHISK_HANDLE} fill={INK.tomato} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={WHISK_HANDLE} fill="none" stroke={INK.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={0} cy={-121} r={2.4} fill={INK.ink} />
    </g>
  );
}

const BLADE = "M-19 -4C-20 -30 -14 -44 0 -46C14 -44 20 -30 19 -4C18 4 -18 4 -19 -4Z";
const SPATULA_HANDLE = "M-4.5 -44L-5.5 -138Q0 -145 5.5 -138L4.5 -44Z";

/** Silicone spatula, blade edge at its origin. `turn` (0–1) rolls the blade over to show its face. */
export function Spatula({ x, y, angle, turn }: { x: number; y: number; angle: number; turn: number }) {
  const sx = Math.max(0.35, Math.abs(Math.cos(turn * Math.PI)));
  return (
    <g aria-hidden transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
      <path d={SPATULA_HANDLE} fill={INK.ink} />
      <g transform={`scale(${sx.toFixed(2)} 1)`}>
        <path d={BLADE} fill={INK.tomato} transform={`translate(${MIS.x} ${MIS.y})`} />
        <path d={BLADE} fill="none" stroke={INK.ink} strokeWidth={3} strokeLinejoin="round" />
        <path d="M-10 -30Q-11 -16 -9 -6" fill="none" stroke={INK.paper} strokeWidth={2.6} strokeLinecap="round" />
      </g>
    </g>
  );
}
