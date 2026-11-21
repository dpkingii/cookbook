"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Scene } from "../contents";
import { landing, useStage } from "../context";
import { cookedColor, poolOf, Scattered } from "../food";
import { HEX, LINE, mix } from "../palette";
import { wall } from "../rough";
import { Steam } from "../Steam";
import s from "../stage.module.css";

const BOX = { x: 54, y: 96, w: 280, h: 138 };
const DEPTH = { dx: 18, dy: -14 };
const WIN = { x: 80, y: 118, w: 164, h: 96 };
const DISH = { cx: 162, rim: 186, rx: 44, ry: 10 };
const SAFFRON = "#e9a23b";
const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 } as const;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** A countertop microwave, seen through its door: a dish on the turntable, lit and turning while it runs. */
export function Microwave({ scene }: { scene: Scene }) {
  const { uid, still } = useStage();
  const { step, items, progress } = scene;
  const running = progress != null && progress > 0 && progress < 1;
  const left = step.timer ? step.timer.seconds * (1 - (progress ?? 0)) : null;
  const display = progress != null && progress >= 1 ? "END" : left != null ? clock(left) : "0:00";
  const pool = poolOf(items.filter((it) => it.ingredient.token.shape === "liquid"));
  const solids = items.filter((it) => it.ingredient.token.shape !== "liquid");
  const clip = `${uid}-mw`;
  const glow = running ? mix(SAFFRON, HEX.white, 0.72) : HEX.light;
  const R = BOX.x + BOX.w;

  return (
    <g>
      {/* top and side faces, then the front */}
      <path d={`M${BOX.x} ${BOX.y}l${DEPTH.dx} ${DEPTH.dy}H${R + DEPTH.dx}l${-DEPTH.dx} ${-DEPTH.dy}Z`} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d={`M${R} ${BOX.y}l${DEPTH.dx} ${DEPTH.dy}v${BOX.h}l${-DEPTH.dx} ${-DEPTH.dy}Z`} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} />
      {[BOX.x + 24, R - 24].map((x) => (
        <rect key={x} x={x - 8} y={BOX.y + BOX.h} width={16} height={6} fill={HEX.ink} />
      ))}

      {/* door and window */}
      <rect x={BOX.x + 12} y={BOX.y + 10} width={WIN.w + 40} height={BOX.h - 20} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
      <clipPath id={clip}>
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} />
      </clipPath>
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill={glow} stroke={HEX.ink} strokeWidth={LINE.detail} className={s.ease} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={DISH.cx} cy={DISH.rim + 22} rx={66} ry={9} fill={HEX.white} stroke={HEX.ink} strokeWidth={1.4} />
        <g className={running && !still ? s.turn : undefined}>
          <path d={wall(DISH.cx, { y: DISH.rim, rx: DISH.rx }, { y: DISH.rim + 20, rx: DISH.rx - 12, ry: 7 }, DISH.ry)} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
          <ellipse cx={DISH.cx} cy={DISH.rim} rx={DISH.rx} ry={DISH.ry} fill={pool ? pool.color : HEX.light} stroke={HEX.ink} strokeWidth={LINE.detail} />
          <AnimatePresence>
            {solids.map((it, k) => (
              <motion.g key={it.ingredient.id} {...landing(it.fresh && progress == null, still, k, -40)}>
                <Scattered item={it} cx={DISH.cx} cy={DISH.rim - 6} rx={DISH.rx - 10} ry={DISH.ry} color={cookedColor(it.ingredient, it.cooked * 0.3)} keep={0.8} size={0.75} />
              </motion.g>
            ))}
          </AnimatePresence>
        </g>
        {running && (progress ?? 0) > 0.35 && <Steam x={DISH.cx} y={DISH.rim - 10} width={60} amount={0.35} size={0.7} />}
      </g>
      {/* window mesh dots */}
      <g opacity={0.25}>
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 14 }, (_, c) => <circle key={`${r}-${c}`} cx={WIN.x + 6 + c * 11.5} cy={WIN.y + 6 + r * 12} r={0.9} fill={HEX.ink} />),
        )}
      </g>
      <rect x={WIN.x + WIN.w + 8} y={WIN.y + 20} width={6} height={56} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />

      {/* control panel */}
      <rect x={278} y={112} width={46} height={18} fill={HEX.ink} />
      <text x={301} y={125} textAnchor="middle" fontSize={11} fill={running ? SAFFRON : HEX.white} style={MONO}>
        {display}
      </text>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={281 + (i % 3) * 14} y={140 + Math.floor(i / 3) * 13} width={10} height={8} fill={HEX.white} stroke={HEX.ink} strokeWidth={1.1} />
      ))}
      <rect x={281} y={184} width={38} height={22} fill={running ? HEX.ink : HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
    </g>
  );
}
