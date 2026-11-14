"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { Burner, Knob } from "../Burner";
import { cookedColor, isPool, poolOf, Scattered, Tangle } from "../food";
import { clamp01, HEX, INK, MIS, mix } from "../palette";
import { blob, ellipse, wall } from "../rough";
import { Bubbles, Sizzle, Steam } from "../Steam";
import s from "../stage.module.css";

const CX = 186;
const RIM = { y: 188, rx: 126, ry: 44 };
const BASE = { y: 208, rx: 110, ry: 38 };
const IN = { cy: 191, rx: 113, ry: 36 };
const FOOD = { cx: 186, cy: 194, rx: 84, ry: 22 };
const HANDLE = "M300 176L382 148C394 144 401 152 397 161C394 168 389 170 384 171L305 199Z";
const HEAT_AMOUNT = { low: 0.35, medium: 0.65, high: 1 } as const;

export function Pan({ scene }: { scene: Scene }) {
  const { uid, still } = useStage();
  const { technique, heat, items } = scene;
  const amt = heat ? HEAT_AMOUNT[heat] : 0;
  const pool = poolOf(items);
  const strands = items.filter((it) => it.ingredient.token.shape === "strand");
  const pieces = items.filter((it) => !isPool(it.ingredient.token.shape) && it.ingredient.token.shape !== "strand");
  const simmer = technique === "simmer";
  const toss = !simmer && (technique === "saute" || technique === "fry") && heat != null && items.length > 0;
  const tossPeriod = 2.3 - amt * 0.9;
  const coat = pool?.sauce ? clamp01(Math.max(0, ...strands.map((st) => st.cooked - 1))) : 0;
  const body = pool ? pool.body * (1 - coat * 0.3) : 0;
  const poolD = pool ? blob(FOOD.cx, FOOD.cy + 1, (FOOD.rx + 16) * body, (FOOD.ry + 10) * body, 77, 0.05 + (pool.done * 0.06), 11) : "";
  const freshPool = items.find((it) => isPool(it.ingredient.token.shape) && it.fresh);

  const piece = (it: Item, k: number) => {
    const submerged = pool?.sauce && it.since < pool.sauce.since;
    const leaf = it.ingredient.token.shape === "leaf";
    return (
      <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k)}>
        <Scattered
          item={it}
          {...FOOD}
          color={cookedColor(it.ingredient, it.cooked)}
          keep={submerged ? 0.35 : leaf ? 1.5 : 1}
          size={leaf ? 1.3 : 1}
        />
      </motion.g>
    );
  };

  return (
    <g>
      <Burner cx={CX} cy={242} rx={98} heat={heat} />
      <Knob heat={heat} />
      <g className={toss ? s.jolt : undefined} style={{ animationDuration: `${tossPeriod}s` }}>
        <path d={HANDLE} fill={INK.ink} />
        <circle cx={385} cy={158} r={4.5} fill={INK.paperDeep} />
        <path d={wall(CX, RIM, BASE, RIM.ry)} fill={INK.tomato} transform={`translate(${MIS.x} ${MIS.y})`} />
        <path d={ellipse(CX, RIM.y, RIM.rx, RIM.ry)} fill={INK.tomatoDeep} transform={`translate(${MIS.x} ${MIS.y})`} />
        <path d={wall(CX, RIM, BASE, RIM.ry)} fill="none" stroke={INK.ink} strokeWidth={3.5} strokeLinejoin="round" />
        <path d="M92 214Q112 228 146 234" fill="none" stroke={INK.paper} strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={CX} cy={IN.cy} rx={IN.rx} ry={IN.ry} fill={INK.ink} />
        <ellipse cx={CX} cy={IN.cy} rx={IN.rx} ry={IN.ry} fill={`url(#${uid}-paperdots)`} opacity={0.22} />
        <ellipse cx={CX} cy={RIM.y} rx={RIM.rx} ry={RIM.ry} fill="none" stroke={INK.ink} strokeWidth={3.5} />

        <g className={toss ? s.toss : undefined} style={{ animationDuration: `${tossPeriod}s` }}>
          <AnimatePresence>
            {pool && (
              <motion.g key="pool" {...landing(Boolean(freshPool), still, 0, -20)}>
                <path d={poolD} fill={pool.color} transform={`translate(${MIS.x} ${MIS.y})`} />
                {pool.done > 0.05 && <path d={poolD} fill={`url(#${uid}-dots)`} opacity={0.3 * pool.done} />}
                <path d={poolD} fill="none" stroke={INK.ink} strokeWidth={2.4} />
                {pool.sauce
                  ? Array.from({ length: Math.round(6 * (1 - pool.done)) }, (_, i) => (
                      <g key={i} transform={`translate(${FOOD.cx - 60 + i * 23} ${FOOD.cy - 8 + ((i * 7) % 3) * 8})`}>
                        <path d={blob(0, 0, 8 - pool.done * 4, 6 - pool.done * 3, 900 + i, 0.25, 6)} fill={mix(pool.sauce!.ingredient.token.color, HEX.paper, 0.18)} stroke={INK.ink} strokeWidth={1.6} />
                      </g>
                    ))
                  : [0, 1, 2].map((i) => (
                      <path
                        key={i}
                        className={s.shimmer}
                        style={{ animationDelay: `${-i * 0.7}s` }}
                        d={`M${FOOD.cx - 50 + i * 38} ${FOOD.cy - 4 + i * 3}q8 -4 16 0`}
                        fill="none"
                        stroke={INK.paper}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      />
                    ))}
              </motion.g>
            )}
            {pieces.filter((it) => it.ingredient.token.shape !== "leaf").map(piece)}
            {strands.map((it, k) => (
              <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k + 1)}>
                <Tangle
                  id={it.ingredient.id}
                  cx={FOOD.cx}
                  cy={FOOD.cy - 2}
                  rx={FOOD.rx + 6}
                  ry={FOOD.ry + 4}
                  n={11}
                  color={mix(cookedColor(it.ingredient, it.cooked), pool?.color ?? it.ingredient.token.color, coat * 0.65)}
                />
              </motion.g>
            ))}
            {pieces.filter((it) => it.ingredient.token.shape === "leaf").map(piece)}
          </AnimatePresence>
        </g>
        {simmer && pool && (
          <Bubbles
            cx={FOOD.cx}
            cy={FOOD.cy}
            rx={FOOD.rx * body}
            ry={FOOD.ry * body}
            n={5}
            r={3.5 + pool.done * 3}
            period={1.4 + pool.done * 2}
            fill={mix(pool.color, HEX.paper, 0.25)}
            seed={3}
          />
        )}
        {technique === "fry" && heat && (
          <Bubbles cx={FOOD.cx} cy={FOOD.cy} rx={FOOD.rx} ry={FOOD.ry} n={9} r={2.4} period={0.5} fill={INK.paper} seed={9} />
        )}
      </g>
      {freshPool && !still && (
        <motion.path
          d={`M${FOOD.cx + 10} -10C${FOOD.cx + 4} 80 ${FOOD.cx + 14} 140 ${FOOD.cx + 4} ${FOOD.cy}`}
          fill="none"
          stroke={freshPool.ingredient.token.color}
          strokeWidth={9}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, times: [0, 0.1, 0.7, 1], delay: 0.2 }}
        />
      )}
      {items.length > 0 && heat && !simmer && (
        <Sizzle cx={FOOD.cx} cy={FOOD.cy} rx={FOOD.rx + 22} ry={FOOD.ry + 16} amount={amt * (technique === "sear" ? 1.2 : 0.8)} />
      )}
      {items.length > 0 && heat && (
        <Steam x={FOOD.cx} y={FOOD.cy - 34} width={150} amount={simmer ? 0.35 + amt * 0.2 : amt * 0.55} />
      )}
    </g>
  );
}
