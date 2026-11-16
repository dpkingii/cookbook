"use client";

import { motion } from "motion/react";
import type { Scene } from "../contents";
import { landing, useClock, useStage } from "../context";
import { blendOf, DOUGH } from "../mixing";
import { HEX, lerp, LINE, mix } from "../palette";
import { blob, rng } from "../rough";
import { BoardTop } from "./Board";

const D = { x: 196, base: 230, rx: 64, ry: 34 };
const PERIOD = 1.7;
const FLOUR = blob(200, 224, 132, 24, 77, 0.22, 14);
const PALM = "M-14-30C4-37 30-33 42-19L46-2C30 6 2 7-16 2C-24-8-24-24-14-30Z";
const FINGERS = [
  [-8, -25, -50, -20],
  [-8, -17, -58, -11],
  [-8, -9, -58, -2],
  [-8, -1, -49, 5],
];
const THUMB = "M2 0C-6 10-24 14-30 9C-27 2-14-2 2 0Z";
const SLEEVE = "M28-22L86-122L120-104L50-3Z";

const ease = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

/** Heel of the hand pressing, then a quarter turn; `pose` runs 0–1 through one push. */
function motionAt(pose: number, turns: number) {
  const press = pose < 0.35 ? ease(pose / 0.35) : pose < 0.55 ? 1 - ease((pose - 0.35) / 0.2) : 0;
  const turn = pose < 0.6 ? 0 : ease((pose - 0.6) / 0.35);
  const lift = pose < 0.55 ? 0 : Math.sin(((pose - 0.55) / 0.45) * Math.PI) * 18;
  return { press, lift, seam: (turns + turn) * 90 };
}

function Hand({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <path d={SLEEVE} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d="M33-34L58-22" stroke={HEX.ink} strokeWidth={LINE.detail} transform="translate(0 -3.5)" />
      {FINGERS.map(([x0, y0, x1, y1]) => (
        <g key={y0}>
          <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={HEX.ink} strokeWidth={12.6} strokeLinecap="round" />
          <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={HEX.white} strokeWidth={8} strokeLinecap="round" />
        </g>
      ))}
      <path d={PALM} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d="M-4-22Q-2-12-6-2" fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} strokeLinecap="round" />
      <path d={THUMB} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
    </g>
  );
}

export function Knead({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const { items, progress } = scene;
  const p = progress ?? 0.5;
  const running = !still && items.length > 0;
  const t = useClock(running);
  const { press, lift, seam } = running ? motionAt((t % PERIOD) / PERIOD, Math.floor(t / PERIOD)) : { press: 0.25, lift: 0, seam: 30 };

  const dough = mix(blendOf(items, DOUGH) ?? "#e8d3a4", "#ecd6a4", 0.6);
  const sx = 1 + press * 0.17;
  const sy = (1 + p * 0.06) * (1 - press * 0.2);
  const top = D.base - D.ry * 2 * sy;
  const mid = D.base - D.ry * sy;
  const wobble = lerp(0.2, 0.035, p);
  const body = blob(0, -D.ry, D.rx, D.ry, 9191, wobble, 11);
  const rand = rng(31);
  const lumps = Array.from({ length: Math.round((1 - p) * 7) }, () => {
    const a = Math.PI * (1.05 + rand() * 0.9);
    return { x: Math.cos(a) * D.rx * 0.92, y: -D.ry + Math.sin(a) * D.ry * 0.9, r: 6 + rand() * 4 };
  });
  const dust = Array.from({ length: Math.round(3 + (1 - p) * 8) }, () => ({ x: (rand() - 0.5) * D.rx * 1.3, y: -D.ry * (1.2 + rand() * 0.6) }));
  const fresh = items.length > 0 && items.every((it) => it.fresh);
  const flour = items.filter((it) => it.fresh && it.ingredient.token.shape === "grain");
  const dusting = items.find((it) => it.ingredient.token.shape === "grain")?.ingredient.token.color ?? HEX.light;

  return (
    <g>
      <BoardTop />
      <path d={FLOUR} fill={dusting} />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={78 + ((i * 53) % 250)} cy={206 + ((i * 29) % 38)} r={1 + (i % 3) * 0.4} fill={HEX.grey} />
      ))}
      {items.length > 0 && (
        <motion.g {...landing(fresh, still, 0, -150)}>
          <g transform={`translate(${D.x} ${D.base}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`}>
            <path d={body} fill={dough} />
            <path d={`M${-D.rx * 0.8} ${-D.ry * 0.35}Q0 ${D.ry * 0.25} ${D.rx * 0.8} ${-D.ry * 0.35}`} fill="none" stroke={mix(dough, "#a8742f", 0.3)} strokeWidth={9} strokeLinecap="round" opacity={0.55} />
            <path d={body} fill="none" stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
            {lumps.map((l, i) => (
              <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={dough} stroke={HEX.ink} strokeWidth={2.2} />
            ))}
            <g transform={`translate(0 ${-D.ry * 1.25}) scale(1 0.42) rotate(${seam.toFixed(1)})`}>
              <path d={`M${-D.rx * 0.55} 6Q0 ${D.rx * 0.32} ${D.rx * 0.55} 6`} fill="none" stroke={HEX.ink} strokeWidth={2.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
            <path d={`M${-D.rx * 0.62} ${-D.ry * 1.2}Q${-D.rx * 0.5} ${-D.ry * 1.75} ${-D.rx * (0.1 - p * 0.12)} ${-D.ry * 1.82}`} fill="none" stroke={HEX.white} strokeWidth={3.2} strokeLinecap="round" />
            {dust.map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width={3} height={3} rx={0.6} fill={HEX.white} stroke={HEX.ink} strokeWidth={0.8} />
            ))}
          </g>
          <Hand x={D.x + 6} y={top + 6 - lift} />
          {press > 0.6 &&
            [-1, 1].map((side) => (
              <ellipse key={side} cx={D.x + side * (D.rx * sx + 8)} cy={D.base - 6} rx={7 * press} ry={4.5 * press} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} opacity={press} />
            ))}
        </motion.g>
      )}
      {!still &&
        flour.flatMap((it, k) =>
          Array.from({ length: 10 }, (_, i) => (
            <motion.rect
              key={`${it.ingredient.id}-${i}`}
              x={D.x - 30 + (i % 5) * 14 + k * 5}
              y={mid - 30 + (i % 3) * 6}
              width={4}
              height={4}
              rx={0.8}
              fill={it.ingredient.token.color}
              stroke={HEX.ink}
              strokeWidth={1}
              initial={{ y: -140, opacity: 0 }}
              animate={{ y: [-140, 0, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.4, times: [0, 0.7, 1], delay: 0.6 + i * 0.06 + k * 0.3 }}
            />
          )),
        )}
    </g>
  );
}
