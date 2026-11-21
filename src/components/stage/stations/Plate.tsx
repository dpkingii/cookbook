"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { cookedColor, isBroth, isEgg, miseCut, poolsUp, isStaple, Mound, PiecePath, placements, poolOf, sauceTints, Scattered, stapleColor, Tangle, VESSEL_PX_PER_CM } from "../food";
import { MiseArt, miseFor, miseSize } from "../mise";
import { clamp01, HEX, LINE, mix } from "../palette";
import { blob, ellipse } from "../rough";
import { Steam } from "../Steam";
import s from "../stage.module.css";

const P = { x: 200, y: 212 };
const TOPPING = { cx: 200, cy: 180, rx: 40, ry: 13 };
/** Where loose food lies on the plate, so a garnish lands on it rather than above it. */
const SPREAD = { cx: 200, cy: 200, rx: 46, ry: 14 };

const GARNISH_SHAPE = { cube: "cube", leaf: "leaf", grain: "grain" } as const;

/** A garnish shower: pieces drifting down onto the food, and the ones that have landed. */
function Garnish({ item, landed, bed }: { item: Item; landed: number; bed: typeof TOPPING }) {
  const { uid } = useStage();
  const ing = item.ingredient;
  const shape = GARNISH_SHAPE[ing.token.shape as keyof typeof GARNISH_SHAPE] ?? "grain";
  const size = shape === "cube" ? 1 : shape === "leaf" ? 0.8 : 1.4;
  const spots = placements(ing.id + "garnish", 14, bed.cx, bed.cy - 2, bed.rx + 18, bed.ry + 4);
  /** Food mise can draw falls as one real piece of it (a parsley leaf, a ring of scallion), drawn once and reused. */
  const match = miseFor(ing);
  const cut = match ? miseCut(item, match).cut : "whole";
  /** Big pieces (picked parsley leaves) come in a few; small ones (chopped scallion) in a shower. */
  const big = match != null && miseSize(match, cut, 1, "piece") > 1.5;
  const id = `${uid}-garnish-${ing.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const piece = (seed: number) =>
    match ? <use href={`#${id}`} transform={`rotate(${(seed % 61) - 30}) scale(${seed % 2 ? -1 : 1} 1)`} /> : <PiecePath shape={shape} color={ing.token.color} seed={seed} size={size} line={1.1} />;
  return (
    <g>
      {match && (
        <defs>
          <g id={id}>
            <MiseArt match={match} cut={cut} x={0} y={0} pxPerCm={VESSEL_PX_PER_CM} layout="piece" />
          </g>
        </defs>
      )}
      {spots.slice(0, big ? Math.min(5, landed) : landed).map((p) => (
        <g key={p.seed} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
          {piece(p.seed)}
        </g>
      ))}
      {Array.from({ length: big ? 4 : 9 }, (_, i) => (
        <g key={i} transform={`translate(${(big ? 165 : 158) + i * (big ? 22 : 10.5)} ${118 + ((i * 17) % 5) * 7})`}>
          <g className={s.fall} style={{ animationDelay: `${-i * 0.27}s`, animationDuration: `${2 + (i % 3) * 0.35}s` }}>
            {piece(i * 101 + 3)}
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
  const { technique, items: all, progress } = scene;
  // Rice that came with its cooking water is congee: it stays a porridge, not a heap.
  const porridge = all.some((it) => it.ingredient.token.shape === "liquid" && /\b(water|stock|broth)\b/i.test(it.ingredient.name));
  const staple = porridge ? undefined : all.find((it) => isStaple(it.ingredient));
  const neat = /\b(mound|pack|mou?ld|flip|invert|turn (it )?out)\b/i.test(scene.step.text);
  const items = staple ? [] : all;
  const garnish = items.filter((it) => it.fresh && !it.carried && !poolsUp(it.ingredient) && it.ingredient.token.shape !== "strand");
  const food = items.filter((it) => !garnish.includes(it));
  const grain = porridge ? all.find((it) => isStaple(it.ingredient)) : undefined;
  /** Egg in a soup is ribbons in the broth; on its own (steamed egg) it is the custard itself. */
  const broth = food.some((it) => isBroth(it.ingredient));
  const ribbons = broth ? food.filter((it) => isEgg(it.ingredient)) : [];
  const watery = poolOf(food.filter((it) => !ribbons.includes(it)));
  const pool = watery && grain ? { ...watery, color: mix(watery.color, stapleColor(grain.ingredient, 1), 0.75) } : watery;
  const strands = food.filter((it) => it.ingredient.token.shape === "strand");
  const pieces = food.filter((it) => !poolsUp(it.ingredient) && it.ingredient.token.shape !== "strand");
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
        {staple && (
          <motion.g key={staple.ingredient.id} {...landing(staple.fresh, still, 0, -60)}>
            <Mound
              id={staple.ingredient.id}
              cx={P.x}
              base={P.y + 8}
              rx={neat ? 74 : 92}
              height={neat ? 62 : 40}
              neat={neat}
              color={stapleColor(staple.ingredient, staple.cooked, sauceTints(all, staple.since))}
              flecks={all
                .filter((it) => it !== staple && it.ingredient.token.shape !== "liquid")
                .map((it) => ({ id: it.ingredient.id, shape: isEgg(it.ingredient) ? ("cube" as const) : it.ingredient.token.shape, color: it.ingredient.token.shape === "round" && !isEgg(it.ingredient) ? it.ingredient.token.color : cookedColor(it.ingredient, it.cooked) }))}
            />
          </motion.g>
        )}
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
        {ribbons.map((it, k) => (
          <motion.g key={`r-${it.ingredient.id}`} {...landing(it.fresh, still, k)}>
            <Scattered brown={false} item={it} cx={P.x} cy={P.y - 6} rx={66} ry={20} color={cookedColor(it.ingredient, it.cooked)} cut="strips" keep={1.3} />
          </motion.g>
        ))}
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
            <Garnish item={it} landed={landed} bed={nest || pool?.sauce || staple ? TOPPING : SPREAD} />
          </motion.g>
        ))}
      </AnimatePresence>

      {technique === "chill" ? (
        <Frost />
      ) : (
        (food.length > 0 || staple) && <Steam x={P.x} y={TOPPING.cy - 26} width={110} amount={technique === "rest" ? 0.45 : 0.3} />
      )}
    </g>
  );
}
