"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Ingredient, Technique } from "@/lib/recipe/types";
import type { Item, Scene } from "../contents";
import { landing, useClock, useStage } from "../context";
import { PiecePath, placements, Scattered } from "../food";
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

const C = { x: 214, y: 192 };
const SCALE = 2.6;
const HALF = 24 * SCALE;
const ANGLE = (118 * Math.PI) / 180;
const DIR = { x: Math.cos(ANGLE), y: Math.sin(ANGLE) };
const NORMAL = { x: Math.sin(ANGLE), y: -Math.cos(ANGLE) };

const STYLE: Record<string, { period: number; amp: number; pieces: number; size: number; cycle: number }> = {
  chop: { period: 0.62, amp: 22, pieces: 26, size: 1.4, cycle: 6 },
  mince: { period: 0.3, amp: 12, pieces: 46, size: 0.95, cycle: 4.5 },
  slice: { period: 0.95, amp: 26, pieces: 9, size: 1, cycle: 7 },
};

function Pile({ item, x, y }: { item: Item; x: number; y: number }) {
  const ing = item.ingredient;
  return <Scattered item={{ ...item, cut: true }} cx={x} cy={y} rx={34} ry={12} color={ing.token.color} keep={1.4} size={0.85} />;
}

/** The ingredient under the knife: whole beyond the blade, in pieces behind it. */
function Cutting({ ing, technique, cut, rock }: { ing: Ingredient; technique: Technique; cut: number; rock: number }) {
  const { uid } = useStage();
  const st = STYLE[technique] ?? STYLE.chop;
  const travel = -HALF * 1.05 + cut * HALF * 2.1;
  const kx = C.x + NORMAL.x * travel;
  const ky = C.y + 6 + NORMAL.y * travel;
  const big = 600;
  const clip = `${uid}-cut`;
  const keep = `M${kx - DIR.x * big} ${ky - DIR.y * big}L${kx + DIR.x * big} ${ky + DIR.y * big}L${kx + DIR.x * big + NORMAL.x * big} ${ky + DIR.y * big + NORMAL.y * big}L${kx - DIR.x * big + NORMAL.x * big} ${ky - DIR.y * big + NORMAL.y * big}Z`;
  const spots = placements(ing.id + technique, st.pieces, C.x - 6, C.y + 16, HALF * 1.05, HALF * 0.42);
  const behind = (x: number, y: number) => (x - kx) * NORMAL.x + (y - ky) * NORMAL.y < -6;
  const slices = technique === "slice";

  return (
    <g>
      <clipPath id={clip}>
        <path d={keep} />
      </clipPath>
      {spots.map((p, i) => {
        if (!behind(p.x, p.y)) return null;
        const away = ((p.x - kx) * NORMAL.x + (p.y - ky) * NORMAL.y) * -0.12;
        const x = slices ? C.x - HALF + i * 15 - away * 3 : p.x - NORMAL.x * Math.min(away, 8);
        const y = slices ? C.y + 22 : p.y;
        return (
          <g key={p.seed} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            {slices ? (
              <ellipse rx={7} ry={HALF * 0.5} fill={ing.token.color} stroke={HEX.ink} strokeWidth={2.2} transform="rotate(-14)" />
            ) : (
              <PiecePath shape={ing.token.shape === "strand" ? "long" : ing.token.shape} color={ing.token.color} seed={p.seed} size={st.size} />
            )}
          </g>
        );
      })}
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(${C.x - HALF} ${C.y - HALF}) scale(${SCALE})`}>
          <TokenArt shape={ing.token.shape} color={ing.token.color} stroke={3.4 / SCALE} />
        </g>
      </g>
      <Knife x={kx} y={ky} angle={-62} lift={rock * st.amp} rock={rock * st.amp * 0.7} />
    </g>
  );
}

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
  const { technique, items, progress } = scene;
  const usedIds = new Set(scene.uses.map((u) => u.id));
  const season = technique === "season";
  const active = season ? null : items.find((it) => usedIds.has(it.ingredient.id) && it.ingredient.token.shape !== "grain");
  const st = STYLE[technique] ?? STYLE.chop;
  const running = !still && active != null;
  const t = useClock(running);
  const cut = progress ?? (running ? (t % st.cycle) / st.cycle : 0.5);
  const phase = (t % st.period) / st.period;
  // Slow lift, fast fall: the blade spends 70% of the stroke rising and drops in the rest.
  const stroke = phase < 0.7 ? (phase / 0.7) * 0.5 : 0.5 + ((phase - 0.7) / 0.3) * 0.5;
  const rock = running ? Math.sin(Math.PI * stroke) : 0;
  const piles = items.filter((it) => it !== active && !usedIds.has(it.ingredient.id));
  const waiting = items.filter((it) => it !== active && usedIds.has(it.ingredient.id) && !season);

  return (
    <g>
      <BoardTop />

      <AnimatePresence>
        {piles.map((it, k) => (
          <motion.g
            key={`pile-${it.ingredient.id}`}
            initial={still ? false : { x: 80, y: 20, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.6 }}
          >
            <Pile item={it} x={100 + (k % 2) * 6} y={176 + k * 30} />
          </motion.g>
        ))}
        {waiting.map((it, k) => (
          <motion.g key={`wait-${it.ingredient.id}`} {...landing(it.fresh, still, k + 1)}>
            <g transform={`translate(${300 - k * 10} ${178 + k * 26}) scale(1.1) translate(-24 -24)`}>
              <TokenArt shape={it.ingredient.token.shape} color={it.ingredient.token.color} stroke={2.6} />
            </g>
          </motion.g>
        ))}
        {active && (
          <motion.g key={`cut-${active.ingredient.id}`} {...landing(active.fresh, still, 0, -150)}>
            <Cutting ing={active.ingredient} technique={technique} cut={cut} rock={rock} />
          </motion.g>
        )}
      </AnimatePresence>

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
