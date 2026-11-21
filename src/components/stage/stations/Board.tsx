"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Ingredient, TokenShape } from "@/lib/recipe/types";
import type { Cut } from "@/vendor/mise";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { PiecePath, placements } from "../food";
import { boardScale, cutFor, miseFor, MiseArt } from "../mise";
import { HEX, LINE } from "../palette";
import { TokenArt } from "../tokens";
import s from "../stage.module.css";
import { Knife } from "./Knife";

const TOP = "M60 152C140 147 260 149 342 146C350 176 352 210 356 240C250 243 140 245 44 244C48 212 54 180 60 152Z";
const EDGE = "M44 244C140 245 250 243 356 240L356 252C250 255 140 257 44 256Z";
const GRAIN_LINES = [
  "M86 170C130 166 170 172 214 168",
  "M246 176C280 172 300 178 330 174",
  "M70 226C120 222 150 228 196 224",
  "M232 220C262 218 300 222 340 218",
];

/** Where this step's cut food sits: a row across the front of the board. */
const FRONT = { left: 78, right: 322, y: 194 };
/** Food cut in earlier steps waits in a row along the back, smaller. */
const BACK = { left: 84, right: 316, y: 166, max: 52 };

/** Pieces for food mise can't draw yet, shaped by the cut rather than the token: diced carrot is cubes, not coins. */
const FALLBACK: Partial<Record<Cut, { shape: TokenShape; size: number; n: number }>> = {
  diced: { shape: "cube", size: 0.75, n: 22 },
  minced: { shape: "cube", size: 0.42, n: 40 },
  strips: { shape: "long", size: 0.8, n: 16 },
};

/** A pile of cut pieces for food mise has no form for yet. */
function TokenPile({ ing, cut, x, y, w }: { ing: Ingredient; cut: Cut; x: number; y: number; w: number }) {
  const shape = ing.token.shape;
  const f = FALLBACK[cut] ?? { shape: shape === "strand" ? "long" : shape, size: 1, n: 12 };
  const spots = placements(ing.id + cut, f.n, x, y, w * 0.4, w * 0.15);
  return (
    <g>
      {spots.map((p) => (
        <g key={p.seed} transform={`translate(${p.x} ${p.y})`}>
          <PiecePath shape={f.shape} color={ing.token.color} seed={p.seed} size={f.size} line={1.5} />
        </g>
      ))}
    </g>
  );
}

/** One ingredient as it should look once cut, centred on (x, y) and no wider than `w`. */
function CutFood({ ing, cut, x, y, w, px }: { ing: Ingredient; cut: Cut; x: number; y: number; w: number; px: number }) {
  const match = miseFor(ing);
  if (match) return <MiseArt match={match} cut={cut} x={x} y={y} pxPerCm={px} max={w * 1.15} />;
  return <TokenPile ing={ing} cut={cut} x={x} y={y} w={Math.min(w, 90)} />;
}

/** Spread n things evenly between left and right. */
const spread = (n: number, left: number, right: number, k: number) => (n === 1 ? (left + right) / 2 : left + ((right - left) * k) / (n - 1));

export function BoardTop() {
  return (
    <g>
      <path d={EDGE} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d={TOP} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      {GRAIN_LINES.map((d) => (
        <path key={d} d={d} fill="none" stroke={HEX.rule} strokeWidth={LINE.detail} strokeLinecap="round" />
      ))}
      <ellipse cx={318} cy={164} rx={8} ry={4.5} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.detail} />
    </g>
  );
}

export function Board({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const { technique, items } = scene;
  const usedIds = new Set(scene.uses.map((u) => u.id));
  const season = technique === "season";
  const cutOf = (it: Item) =>
    it.cutIn ? cutFor(it.ingredient, it.cutIn.technique, it.cutIn.text, miseFor(it.ingredient)) : cutFor(it.ingredient, technique, scene.step.text, miseFor(it.ingredient));
  // A cutting step shows the result, not the cutting: each ingredient as it should look once cut.
  const now = season ? [] : items.filter((it) => usedIds.has(it.ingredient.id) && it.ingredient.token.shape !== "grain");
  const before = items.filter((it) => !now.includes(it));
  const slot = Math.min(170, (FRONT.right - FRONT.left) / Math.max(1, now.length) + 10);
  const px = boardScale(
    now.flatMap((it) => {
      const match = miseFor(it.ingredient);
      return match ? [{ match, cut: cutOf(it) }] : [];
    }),
    slot,
  );
  const backPx = boardScale(
    before.flatMap((it) => {
      const match = miseFor(it.ingredient);
      return match ? [{ match, cut: cutOf(it) }] : [];
    }),
    BACK.max,
  );

  return (
    <g>
      <BoardTop />

      <AnimatePresence>
        {before.map((it, k) => (
          <motion.g
            key={`back-${it.ingredient.id}`}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.4 }}
          >
            <CutFood ing={it.ingredient} cut={cutOf(it)} x={spread(Math.max(before.length, 3), BACK.left, BACK.right, k)} y={BACK.y} w={BACK.max} px={Math.min(px, backPx)} />
          </motion.g>
        ))}
        {now.map((it, k) => (
          <motion.g key={`now-${it.ingredient.id}`} {...landing(it.fresh, still, k, -60)}>
            <CutFood ing={it.ingredient} cut={cutOf(it)} x={spread(now.length, FRONT.left + slot / 2 - 10, FRONT.right - slot / 2 + 10, k)} y={FRONT.y} w={slot} px={px} />
          </motion.g>
        ))}
      </AnimatePresence>

      {/* The knife is put down along the front edge, its work done. */}
      {now.length > 0 && <Knife x={236} y={241} angle={-4} lift={0} zoom={0.62} />}

      {season &&
        scene.uses.map((ing, k) => (
          <Seasoning key={ing.id} ing={ing} order={k} />
        ))}
    </g>
  );
}

function Seasoning({ ing, order }: { ing: Ingredient; order: number }) {
  const x = 120 + order * 40;
  return (
    <g aria-hidden>
      <g transform={`translate(${x} 64) scale(1.1) translate(-24 -24)`}>
        <TokenArt shape={ing.token.shape} color={ing.token.color} />
      </g>
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`translate(${x - 12 + (i % 4) * 8} ${120 + (i % 3) * 14})`}>
          <g className={s.fall} style={{ animationDelay: `${-i * 0.3}s`, animationDuration: "1.8s" }}>
            <PiecePath shape={ing.token.shape === "leaf" ? "leaf" : "grain"} color={ing.token.color} seed={i * 31 + 7} size={ing.token.shape === "leaf" ? 0.5 : 1.2} />
          </g>
        </g>
      ))}
    </g>
  );
}
