import type { Heat } from "@/lib/recipe/types";
import { INK } from "./palette";
import s from "./stage.module.css";

const SLOTS = 9;
const HEAT = {
  low: { count: 5, scale: 0.55, ring: 0.82 },
  medium: { count: 7, scale: 0.85, ring: 0.95 },
  high: { count: 9, scale: 1.2, ring: 1.14 },
} as const;

const FLAME = "M0 0C-7 0-9-8-5-14C-3-18-1-21 0-27C3-20 9-15 8-7C7-2 4 0 0 0Z";
const CORE = "M0-1C-3.5-1-4.5-5-2.5-8.5C-1.5-10.5-0.5-12 0-15C1.5-11.5 4.5-9 4-5C3.5-2 2-1 0-1Z";

/** Where the flame tongues stand. Slot k is lit if it is among the middle `count`. */
function slot(k: number, cx: number, cy: number, rx: number, ry: number) {
  const a = (Math.PI * (k + 0.5)) / SLOTS;
  return { x: Math.round(cx + Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry) };
}

/**
 * Drawn behind the vessel, so only the tongues licking out around it show.
 * Size, count and spread all grow with heat so low and high are obvious at a glance.
 */
export function Burner({
  cx,
  cy,
  rx,
  heat,
}: {
  cx: number;
  cy: number;
  rx: number;
  heat: Heat | null;
}) {
  const h = heat ? HEAT[heat] : null;
  const ry = rx * 0.24;
  return (
    <g aria-hidden>
      <ellipse cx={cx} cy={cy + 3} rx={rx * 1.05} ry={ry * 1.05} fill="none" stroke={INK.ink} strokeWidth={5} />
      <ellipse cx={cx} cy={cy + 3} rx={rx * 0.55} ry={ry * 0.55} fill={INK.ink} />
      {Array.from({ length: SLOTS }, (_, k) => {
        const lit = h ? Math.abs(k - (SLOTS - 1) / 2) <= (h.count - 1) / 2 : false;
        const p = slot(k, cx, cy, rx * (h?.ring ?? 0.8), ry * (h?.ring ?? 0.8));
        const sc = lit && h ? h.scale * (k % 2 ? 0.86 : 1) : 0;
        return (
          <g
            key={k}
            className={s.ease}
            style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${sc})`, opacity: lit ? 1 : 0 }}
          >
            <g className={s.flicker} style={{ animationDelay: `${-k * 0.13}s` }}>
              <path d={FLAME} fill={INK.tomato} transform="translate(1.2 0.8)" />
              <path d={FLAME} fill="none" stroke={INK.ink} strokeWidth={1.8} strokeLinejoin="round" />
              <path d={CORE} fill={INK.gold} transform="translate(-0.8 0.6)" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

const KNOB_ANGLE = { off: 0, low: 70, medium: 135, high: 200 } as const;

/** A stove dial in the corner: a second, unmistakable read of the heat. */
export function Knob({ heat, x = 50, y = 262 }: { heat: Heat | null; x?: number; y?: number }) {
  const angle = KNOB_ANGLE[heat ?? "off"];
  return (
    <g aria-hidden transform={`translate(${x} ${y})`}>
      {[0, 70, 135, 200].map((a, i) => (
        <circle
          key={a}
          cx={Math.sin((a * Math.PI) / 180) * 19}
          cy={-Math.cos((a * Math.PI) / 180) * 19}
          r={i === 0 ? 1.6 : 1.4 + i * 0.7}
          fill={i === 0 ? INK.inkSoft : INK.ink}
        />
      ))}
      <circle r={13} fill={heat ? INK.tomato : INK.paper} transform="translate(1.5 1)" />
      <circle r={13} fill="none" stroke={INK.ink} strokeWidth={3} />
      <g className={s.ease} style={{ transform: `rotate(${angle}deg)` }}>
        <path d="M0 -10V-2" stroke={INK.ink} strokeWidth={4} strokeLinecap="round" />
      </g>
    </g>
  );
}
