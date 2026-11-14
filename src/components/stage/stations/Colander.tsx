"use client";

import { motion } from "motion/react";
import type { Item } from "../contents";
import { useStage } from "../context";
import { cookedColor, Scattered, Tangle } from "../food";
import { INK, MIS, WATER } from "../palette";
import { Steam } from "../Steam";
import s from "../stage.module.css";

const C = { x: 106, y: 204, rx: 70, ry: 16 };
const BOWL = `M${C.x - C.rx} ${C.y}C${C.x - C.rx + 4} ${C.y + 44} ${C.x + C.rx - 4} ${C.y + 44} ${C.x + C.rx} ${C.y}Z`;
const SINK = "M12 214Q12 206 22 206H196Q206 206 206 214V304H12Z";

/** Where the tipped pot's lip ends up; the pour is drawn from here. */
export const LIP = { x: 156, y: 150 };

export function Colander({ items }: { items: Item[] }) {
  const { uid, still } = useStage();
  return (
    <motion.g
      initial={still ? false : { x: -160, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -160, opacity: 0 }}
      transition={{ duration: still ? 0 : 0.7, ease: [0.5, 0, 0.2, 1] }}
    >
      <path d={SINK} fill={INK.ink} transform={`translate(${MIS.x} ${MIS.y})`} opacity={0.85} />
      <path d={SINK} fill={`url(#${uid}-paperdots)`} opacity={0.35} />
      <path d={SINK} fill="none" stroke={INK.ink} strokeWidth={3.5} />

      <path
        d={`M${LIP.x} ${LIP.y}C${LIP.x - 6} ${LIP.y + 12} ${C.x + 28} ${C.y - 40} ${C.x + 20} ${C.y + 2}`}
        fill="none"
        stroke={INK.ink}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <path
        d={`M${LIP.x} ${LIP.y}C${LIP.x - 6} ${LIP.y + 12} ${C.x + 28} ${C.y - 40} ${C.x + 20} ${C.y + 2}`}
        fill="none"
        stroke={WATER}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        className={s.flow}
        d={`M${LIP.x} ${LIP.y}C${LIP.x - 6} ${LIP.y + 12} ${C.x + 28} ${C.y - 40} ${C.x + 20} ${C.y + 2}`}
        fill="none"
        stroke={INK.paper}
        strokeWidth={2.5}
        strokeDasharray="8 10"
        strokeLinecap="round"
      />

      <ellipse cx={C.x} cy={C.y} rx={C.rx} ry={C.ry} fill={INK.ink} />
      {items.map((it) =>
        it.ingredient.token.shape === "strand" ? (
          <Tangle key={it.ingredient.id} id={it.ingredient.id} cx={C.x} cy={C.y - 4} rx={C.rx - 14} ry={C.ry} n={10} color={cookedColor(it.ingredient, it.cooked)} />
        ) : (
          <Scattered key={it.ingredient.id} item={it} cx={C.x} cy={C.y - 2} rx={C.rx - 18} ry={C.ry - 4} color={cookedColor(it.ingredient, it.cooked)} />
        ),
      )}
      <path d={BOWL} fill={INK.paper} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={BOWL} fill="none" stroke={INK.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <ellipse cx={C.x} cy={C.y} rx={C.rx} ry={C.ry} fill="none" stroke={INK.ink} strokeWidth={3.5} />
      {[0, 1].map((row) =>
        Array.from({ length: 7 - row * 2 }, (_, i) => (
          <circle key={`${row}-${i}`} cx={C.x - 42 + row * 14 + i * 14} cy={C.y + 13 + row * 11} r={2.2} fill={INK.ink} />
        )),
      )}
      <path d={`M${C.x - C.rx} ${C.y}l-12 -3M${C.x + C.rx} ${C.y}l12 -3`} stroke={INK.ink} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${C.x - 22} ${C.y + 33}L${C.x - 28} ${C.y + 42}H${C.x + 28}L${C.x + 22} ${C.y + 33}`} fill={INK.tomato} stroke={INK.ink} strokeWidth={3} strokeLinejoin="round" />

      {[-24, -8, 8, 24, 0].map((dx, i) => (
        <g key={i} transform={`translate(${C.x + dx} ${C.y + 58})`}>
          <path
            className={s.drip}
            d="M0 -5C2 -2 3 0 3 2A3 3 0 0 1 -3 2C-3 0 -2 -2 0 -5Z"
            fill={WATER}
            stroke={INK.ink}
            strokeWidth={1.4}
            style={{ animationDelay: `${-i * 0.27}s` }}
          />
        </g>
      ))}
      <Steam x={C.x} y={C.y - 24} width={110} amount={0.9} size={1.4} />
    </motion.g>
  );
}
