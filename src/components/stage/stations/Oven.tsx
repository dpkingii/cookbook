"use client";

import type { Heat } from "@/lib/recipe/types";
import type { Scene } from "../contents";
import { useStage } from "../context";
import { Knob } from "../Burner";
import { clamp01, INK, MIS } from "../palette";
import s from "../stage.module.css";
import { Drizzle, OvenFood } from "./OvenFood";

const BODY = "M58 304V36Q58 18 76 18H324Q342 18 342 36V304Z";
const WIN = { x: 96, y: 114, w: 208, h: 162 };
const BACK = { x: 120, y: 128, w: 160, h: 126 };
const TOP_EL = 132;
const BOTTOM_EL = 262;
const RACK = { low: 240, high: 180 };

const GLOW: Record<Heat, { level: number; core: string; waves: number; band: number; period: number }> = {
  low: { level: 0.25, core: INK.tomatoDeep, waves: 2, band: 0.08, period: 3 },
  medium: { level: 0.65, core: INK.tomato, waves: 4, band: 0.3, period: 2.2 },
  high: { level: 1, core: INK.gold, waves: 7, band: 0.45, period: 1.4 },
};

function coil(y: number): string {
  let d = `M112 ${y}`;
  for (let x = 112, k = 0; x < 288; x += 16, k++) d += `Q${x + 8} ${y + (k % 2 ? 6 : -6)} ${x + 16} ${y}`;
  return d;
}

/** A heating element: dark and cold when off, glowing harder with each heat step. */
function Element({ y, heat, ramp, fast }: { y: number; heat: Heat | null; ramp: number; fast: boolean }) {
  const g = heat ? GLOW[heat] : null;
  const d = coil(y);
  const towardFood = y < 200 ? 1 : -1;
  return (
    <g aria-hidden>
      {g && (
        <g opacity={ramp}>
          <g className={s.pulse} style={{ animationDuration: `${g.period * (fast ? 0.45 : 1)}s` }}>
            <rect x={WIN.x} y={towardFood > 0 ? y : y - 40} width={WIN.w} height={40} fill={INK.tomato} opacity={g.band} />
            <rect x={WIN.x} y={towardFood > 0 ? y : y - 18} width={WIN.w} height={18} fill={INK.tomato} opacity={g.band} />
            <path d={d} fill="none" stroke={INK.tomato} strokeWidth={4 + g.level * 18} strokeLinecap="round" opacity={0.35 + g.level * 0.4} />
          </g>
        </g>
      )}
      <path d={d} fill="none" stroke={INK.inkSoft} strokeWidth={6.5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={g && ramp > 0.3 ? g.core : INK.ink} strokeWidth={2.8} strokeLinecap="round" />
    </g>
  );
}

/** Heat shimmer rising off the bottom element. */
function Waves({ heat, y }: { heat: Heat; y: number }) {
  const g = GLOW[heat];
  return (
    <g aria-hidden>
      {Array.from({ length: g.waves }, (_, i) => (
        <g key={i} transform={`translate(${130 + (i * 140) / Math.max(1, g.waves - 1)} ${y})`}>
          <path
            className={s.rise}
            d="M0 0C-4-5 4-10 0-15C-4-20 4-25 0-30"
            fill="none"
            stroke={INK.paper}
            strokeWidth={2.6}
            strokeLinecap="round"
            opacity={0.75}
            style={{ animationDuration: `${3.4 - g.level * 1.6}s`, animationDelay: `${-i * 0.53}s` }}
          />
        </g>
      ))}
    </g>
  );
}

/** Radiant heat beating down from the broiler onto the food. */
function Rays({ heat, to }: { heat: Heat; to: number }) {
  const g = GLOW[heat];
  const n = 3 + g.waves;
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const x = 128 + (i * 144) / (n - 1);
        return (
          <path
            key={i}
            className={s.flow}
            d={`M${x} ${TOP_EL + 8}L${x + (x - 200) * 0.08} ${to}`}
            stroke={i % 2 ? INK.gold : INK.tomato}
            strokeWidth={2.4}
            strokeDasharray="5 7"
            strokeLinecap="round"
            style={{ animationDuration: `${0.9 - g.level * 0.5}s` }}
          />
        );
      })}
    </g>
  );
}

const MODE_ANGLE = { bottom: -55, top: 55 } as const;

function Panel({ heat, ramp, top }: { heat: Heat | null; ramp: number; top: boolean }) {
  const fill = heat ? GLOW[heat].level * ramp : 0;
  const ready = heat != null && ramp >= 1;
  return (
    <g aria-hidden>
      <rect x={72} y={28} width={256} height={48} rx={7} fill={INK.paper} transform={`translate(${MIS.x} ${MIS.y})`} />
      <rect x={72} y={28} width={256} height={48} rx={7} fill="none" stroke={INK.ink} strokeWidth={3} />
      <Knob heat={heat} x={104} y={53} />
      <rect x={138} y={46} width={100} height={14} rx={7} fill={INK.paperDeep} stroke={INK.ink} strokeWidth={2.4} />
      {fill > 0 && <rect x={140} y={48} width={96 * fill} height={10} rx={5} fill={INK.tomato} className={s.ease} />}
      {[0.35, 0.65].map((k) => (
        <path key={k} d={`M${140 + 96 * k} 44V62`} stroke={INK.ink} strokeWidth={1.6} />
      ))}
      <circle cx={256} cy={53} r={5.5} fill={ready ? INK.gold : INK.paperDeep} stroke={INK.ink} strokeWidth={2.2} />
      <g transform="translate(298 53)">
        <rect x={-24} y={-8} width={8} height={8} fill="none" stroke={INK.ink} strokeWidth={1.6} transform="rotate(-10)" />
        <path d="M-24 -1.5h8" stroke={INK.ink} strokeWidth={2.4} transform="rotate(-10)" />
        <rect x={16} y={-8} width={8} height={8} fill="none" stroke={INK.ink} strokeWidth={1.6} transform="rotate(10)" />
        <path d="M16 -6.5h8" stroke={INK.ink} strokeWidth={2.4} transform="rotate(10)" />
        <circle r={11} fill={INK.paperDeep} stroke={INK.ink} strokeWidth={2.6} />
        <g className={s.ease} style={{ transform: `rotate(${MODE_ANGLE[top ? "top" : "bottom"]}deg)` }}>
          <path d="M0 -8V-1" stroke={INK.ink} strokeWidth={3.2} strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

export function Oven({ scene }: { scene: Scene }) {
  const { uid } = useStage();
  const { technique, heat, items, progress } = scene;
  const broil = technique === "broil";
  const ramp = items.length === 0 && !scene.warmed ? Math.max(0.15, progress ?? 0.6) : 1;
  const rackY = broil ? RACK.high : RACK.low;
  const char = broil ? clamp01(progress ?? 0.4) : 0;
  const clip = `${uid}-oven`;

  return (
    <g>
      <path d={BODY} fill={INK.tomato} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={BODY} fill="none" stroke={INK.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <Panel heat={heat} ramp={ramp} top={broil} />
      <rect x={72} y={84} width={256} height={216} rx={10} fill={INK.paper} transform={`translate(${MIS.x} ${MIS.y})`} />
      <rect x={72} y={84} width={256} height={216} rx={10} fill="none" stroke={INK.ink} strokeWidth={3.5} />
      <rect x={112} y={90} width={10} height={12} rx={2} fill={INK.ink} />
      <rect x={278} y={90} width={10} height={12} rx={2} fill={INK.ink} />
      <rect x={102} y={93} width={196} height={10} rx={5} fill={INK.paperDeep} stroke={INK.ink} strokeWidth={3} />

      <clipPath id={clip}>
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={12} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill={INK.ink} />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} fill={`url(#${uid}-paperdots)`} opacity={0.16} />
        <path
          d={`M${WIN.x} ${WIN.y}L${BACK.x} ${BACK.y}M${WIN.x + WIN.w} ${WIN.y}L${BACK.x + BACK.w} ${BACK.y}M${WIN.x} ${WIN.y + WIN.h}L${BACK.x} ${BACK.y + BACK.h}M${WIN.x + WIN.w} ${WIN.y + WIN.h}L${BACK.x + BACK.w} ${BACK.y + BACK.h}`}
          stroke={INK.inkSoft}
          strokeWidth={1.6}
        />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} fill="none" stroke={INK.inkSoft} strokeWidth={1.6} />
        {[RACK.high, (RACK.high + RACK.low) / 2, RACK.low].map((y) => (
          <path key={y} d={`M${WIN.x + 4} ${y + 6}h12M${WIN.x + WIN.w - 16} ${y + 6}h12`} stroke={INK.inkSoft} strokeWidth={3} strokeLinecap="round" />
        ))}

        <Element y={TOP_EL} heat={broil ? heat : null} ramp={ramp} fast />
        <Element y={BOTTOM_EL} heat={broil ? null : heat} ramp={ramp} fast={false} />
        {!broil && heat && <Waves heat={heat} y={BOTTOM_EL - 10} />}
        {broil && heat && items.length > 0 && <Rays heat={heat} to={rackY - 30} />}

        <g className={s.ease} style={{ transform: `translate(200px, ${rackY}px)` }}>
          <path d="M-100 7H100M-100 13H100" stroke={INK.inkSoft} strokeWidth={2.4} />
          {[-80, -50, -20, 10, 40, 70].map((x) => (
            <path key={x} d={`M${x} 7v6`} stroke={INK.inkSoft} strokeWidth={2} />
          ))}
          <OvenFood scene={scene} char={char} />
        </g>
        <Drizzle items={items} x={200} top={WIN.y} bottom={rackY - 16} />
        <path d={`M${WIN.x + 14} ${WIN.y + 18}L${WIN.x + 40} ${WIN.y + 6}M${WIN.x + 14} ${WIN.y + 34}L${WIN.x + 58} ${WIN.y + 12}`} stroke={INK.paper} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      </g>
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={12} fill="none" stroke={INK.ink} strokeWidth={4} />
    </g>
  );
}
