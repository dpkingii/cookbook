"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { cookedColor, isPool, PiecePath, placements, poolOf, Scattered, Tangle } from "../food";
import { clamp01, HEX, LINE, mix } from "../palette";
import { blob, ellipse } from "../rough";
import { Steam } from "../Steam";
import s from "../stage.module.css";

const P = { x: 200, y: 212 };
const TOPPING = { cx: 200, cy: 180, rx: 40, ry: 13 };

const GARNISH_SHAPE = { cube: "cube", leaf: "leaf", grain: "grain" } as const;

/** A garnish shower: pieces drifting down onto the food, and the ones that have landed. */
function Garnish({ item, landed }: { item: Item; landed: number }) {
  const ing = item.ingredient;
  const shape = GARNISH_SHAPE[ing.token.shape as keyof typeof GARNISH_SHAPE] ?? "grain";
  const size = shape === "cube" ? 1 : shape === "leaf" ? 0.8 : 1.4;
  const spots = placements(ing.id + "garnish", 14, TOPPING.cx, TOPPING.cy - 2, TOPPING.rx + 18, TOPPING.ry + 4);
  return (
    <g>
      {spots.slice(0, landed).map((p) => (
        <g key={p.seed} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
          <PiecePath shape={shape} color={ing.token.color} seed={p.seed} size={size} line={1.1} />
        </g>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(${158 + i * 10.5} ${118 + ((i * 17) % 5) * 7})`}>
          <g className={s.fall} style={{ animationDelay: `${-i * 0.27}s`, animationDuration: `${2 + (i % 3) * 0.35}s` }}>
            <PiecePath shape={shape} color={ing.token.color} seed={i * 101 + 3} size={size} line={1.1} />
          </g>
        </g>
      ))}
    </g>
  );
}

function Frost() {
  return (
    <g aria-hidden>
      {[
        [96, 120],
        [300, 104],
        [330, 168],
        [70, 176],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} className={s.shimmer} style={{ animationDelay: `${-i * 0.5}s` }}>
          <path d="M0 -9V9M-8 -4.5L8 4.5M-8 4.5L8 -4.5" stroke={HEX.grey} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

export function Plate({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const { technique, items, progress } = scene;
  const garnish = items.filter((it) => it.fresh && !isPool(it.ingredient.token.shape) && it.ingredient.token.shape !== "strand");
  const food = items.filter((it) => !garnish.includes(it));
  const pool = poolOf(food);
  const strands = food.filter((it) => it.ingredient.token.shape === "strand");
  const pieces = food.filter((it) => !isPool(it.ingredient.token.shape) && it.ingredient.token.shape !== "strand");
  const nest = strands.length > 0;
  const coat = pool?.sauce ? clamp01(Math.max(0, ...strands.map((st) => st.cooked - 1))) : 0;
  const sauceD = pool
    ? nest
      ? blob(TOPPING.cx, TOPPING.cy, TOPPING.rx, TOPPING.ry + 2, 55, 0.12, 9)
      : blob(P.x, P.y - 4, 84, 28, 55, 0.08, 11)
    : "";
  const landed = progress == null ? 7 : Math.round(2 + progress * 12);

  return (
    <g>
      <path d={ellipse(P.x, P.y, 160, 58)} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} />
      <ellipse cx={P.x} cy={P.y} rx={141} ry={50} fill="none" stroke={HEX.ink} strokeWidth={1} />
      <ellipse cx={P.x} cy={P.y + 2} rx={106} ry={37} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />

      <AnimatePresence>
        {strands.map((it, k) => {
          const color = mix(cookedColor(it.ingredient, it.cooked), pool?.color ?? it.ingredient.token.color, 0.15 + coat * 0.3);
          return (
            <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k)}>
              <Tangle id={it.ingredient.id} cx={P.x} cy={P.y - 2} rx={96} ry={30} n={13} color={color} line={3.6} />
              <Tangle id={it.ingredient.id + "m"} cx={P.x} cy={P.y - 14} rx={72} ry={22} n={10} color={color} line={3.6} />
              <Tangle id={it.ingredient.id + "t"} cx={P.x} cy={P.y - 26} rx={46} ry={14} n={7} color={color} line={3.6} />
            </motion.g>
          );
        })}
        {pool && (
          <motion.g key="sauce" {...landing(false, still)}>
            <path d={sauceD} fill={pool.color} stroke={HEX.ink} strokeWidth={2} />
            <path
              d={`M${TOPPING.cx - 18} ${TOPPING.cy - 5}q10 -5 20 -2`}
              fill="none"
              stroke={mix(pool.color, HEX.white, 0.6)}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          </motion.g>
        )}
        {pieces.map((it, k) => {
          const leaf = it.ingredient.token.shape === "leaf";
          const sunk = pool?.sauce && !leaf;
          return (
            <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k)}>
              <Scattered
                item={it}
                cx={nest || sunk ? TOPPING.cx : P.x}
                cy={nest || sunk ? TOPPING.cy - (leaf ? 6 : 0) : P.y - 6}
                rx={nest || sunk ? TOPPING.rx - 6 : 70}
                ry={nest || sunk ? TOPPING.ry - 2 : 22}
                color={cookedColor(it.ingredient, it.cooked)}
                keep={leaf ? 0.75 : sunk ? 0.3 : 1}
                size={leaf ? 1.2 : 0.8}
              />
            </motion.g>
          );
        })}
        {garnish.map((it) => (
          <motion.g key={`g-${it.ingredient.id}`} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Garnish item={it} landed={landed} />
          </motion.g>
        ))}
      </AnimatePresence>

      {technique === "chill" ? (
        <Frost />
      ) : (
        food.length > 0 && <Steam x={P.x} y={TOPPING.cy - 26} width={110} amount={technique === "rest" ? 0.45 : 0.3} />
      )}
    </g>
  );
}
