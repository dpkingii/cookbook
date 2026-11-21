"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Scene } from "../contents";
import { landing, useStage } from "../context";
import { isStaple, Mound, Scattered, stapleColor } from "../food";
import { HEX, LINE, mix, WATER } from "../palette";
import { Steam } from "../Steam";
import s from "../stage.module.css";

const CX = 200;
const RIM = { y: 126, rx: 94, ry: 25 };
const POT = { cy: 130, rx: 80, ry: 18 };
const BODY = `M${CX - 94} 126C${CX - 104} 168 ${CX - 98} 214 ${CX - 80} 236A80 20 0 0 0 ${CX + 80} 236C${CX + 98} 214 ${CX + 104} 168 ${CX + 94} 126Z`;
const LID = `M${CX - 96} 126C${CX - 92} 84 ${CX + 92} 84 ${CX + 96} 126A96 25 0 0 1 ${CX - 96} 126Z`;
const SAFFRON = "#e9a23b";
const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 } as const;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/**
 * An electric rice cooker. The lid is open while the rice goes in, shuts once the timer runs,
 * stays shut on Warm while the rice steams, and opens again to fluff it.
 */
export function Cooker({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const { step, items, progress, technique } = scene;
  const resting = technique === "rest" || technique === "chill";
  const fluff = /\b(fluff|stir|loosen|scoop|serve)\b/i.test(step.text);
  const open = fluff || (!resting && (progress == null || progress === 0));
  const cooking = !resting && !open;
  const staple = items.find((it) => isStaple(it.ingredient));
  const done = staple ? staple.cooked >= 1 : resting;
  const others = items.filter((it) => it !== staple && it.ingredient.token.shape !== "liquid");
  const water = !done && items.some((it) => it.ingredient.token.shape === "liquid");
  const left = step.timer ? step.timer.seconds * (1 - (progress ?? 0)) : null;
  const display = cooking ? (left != null ? clock(left) : "COOK") : resting ? "WARM" : fluff ? "WARM" : left != null ? clock(left) : "----";

  return (
    <g>
      {/* lid swung up on its back hinge */}
      <g className={s.ease} style={{ opacity: open ? 1 : 0 }}>
        <ellipse cx={CX} cy={70} rx={90} ry={50} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} />
        <ellipse cx={CX} cy={72} rx={74} ry={38} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.detail} />
        <circle cx={CX} cy={70} r={9} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
        <path d={`M${CX - 24} 118L${CX - 20} 104M${CX + 24} 118L${CX + 20} 104`} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinecap="round" />
      </g>

      <path d={BODY} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d={`M${CX - 70} 246L${CX - 66} 238M${CX + 70} 246L${CX + 66} 238`} stroke={HEX.ink} strokeWidth={5} strokeLinecap="round" />
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M${CX + side * 100} 146q${side * 12} 2 ${side * 12} 14q0 8 ${side * -10} 8`}
          fill={HEX.white}
          stroke={HEX.ink}
          strokeWidth={LINE.main}
          strokeLinejoin="round"
        />
      ))}

      {/* inner pot and what is in it, visible only with the lid up */}
      <ellipse cx={CX} cy={RIM.y} rx={RIM.rx} ry={RIM.ry} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} />
      <ellipse cx={CX} cy={POT.cy - 3} rx={POT.rx + 4} ry={POT.ry + 2} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.detail} />
      <g className={s.ease} style={{ opacity: open ? 1 : 0 }}>
        <AnimatePresence>
          {water && (
            <motion.ellipse key="water" cx={CX} cy={POT.cy} rx={POT.rx - 4} ry={POT.ry - 3} fill={WATER} stroke={HEX.ink} strokeWidth={1.2} {...landing(true, still, 1, -30)} />
          )}
          {staple && !done && (
            <motion.g key="raw" {...landing(staple.fresh, still, 0)}>
              <Scattered item={{ ...staple, cut: true }} cx={CX} cy={POT.cy} rx={POT.rx - 14} ry={POT.ry - 6} color={mix(staple.ingredient.token.color, "#e2ddcc", 0.5)} keep={2.4} />
            </motion.g>
          )}
          {staple && done && (
            <motion.g key="cooked" initial={false} animate={{ opacity: 1 }}>
              <Mound id={staple.ingredient.id} cx={CX} base={POT.cy + 12} rx={POT.rx - 2} height={22} color={stapleColor(staple.ingredient, 1)} />
            </motion.g>
          )}
          {others.map((it, k) => (
            <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k + 1)}>
              <Scattered item={it} cx={CX} cy={POT.cy - 2} rx={POT.rx - 20} ry={POT.ry - 6} color={it.ingredient.token.color} />
            </motion.g>
          ))}
        </AnimatePresence>
        {fluff && (
          <g className={s.fluff} aria-hidden>
            {[0, 7].map((dx) => (
              <path key={dx} d={`M${CX + 30 + dx} 122L${CX + 86 + dx * 1.6} 34`} stroke={HEX.ink} strokeWidth={5} strokeLinecap="round" />
            ))}
            {[0, 7].map((dx) => (
              <path key={`i${dx}`} d={`M${CX + 30 + dx} 122L${CX + 86 + dx * 1.6} 34`} stroke="#d9b98a" strokeWidth={2.4} strokeLinecap="round" />
            ))}
          </g>
        )}
      </g>

      {/* closed lid */}
      <g className={s.ease} style={{ opacity: open ? 0 : 1 }}>
        <path d={LID} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
        <path d={`M${CX - 60} 108Q${CX} 92 ${CX + 60} 108`} fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
        <rect x={CX - 22} y={90} width={44} height={9} rx={4.5} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
        <circle cx={CX + 52} cy={104} r={5} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.detail} />
      </g>

      {/* control panel */}
      <rect x={CX - 40} y={164} width={80} height={46} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
      <rect x={CX - 32} y={170} width={64} height={18} fill={HEX.ink} />
      <text x={CX} y={183.5} textAnchor="middle" fontSize={12} fill={HEX.white} style={MONO}>
        {display}
      </text>
      {[
        { label: "COOK", x: CX - 18, on: cooking },
        { label: "WARM", x: CX + 18, on: !cooking && (resting || fluff || done) },
      ].map((l) => (
        <g key={l.label}>
          <circle cx={l.x - 12} cy={199} r={3.6} fill={l.on ? SAFFRON : HEX.white} stroke={HEX.ink} strokeWidth={1.2} className={l.on && cooking ? s.pulse : undefined} />
          <text x={l.x - 6} y={202} fontSize={7.5} fill={HEX.ink} style={MONO}>
            {l.label}
          </text>
        </g>
      ))}

      {!open && <Steam x={CX + 52} y={92} width={26} amount={cooking ? 0.3 + (progress ?? 0) * 0.3 : 0.15} size={0.9} />}
      {fluff && done && <Steam x={CX - 20} y={POT.cy - 18} width={110} amount={0.45} />}
    </g>
  );
}
