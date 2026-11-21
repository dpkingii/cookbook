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
import { BOARD_PX_PER_CM, boardScale, cutFor, miseFor, MiseArt, miseSize, type MiseMatch } from "../mise";
import type { Cut } from "@/vendor/mise";

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

function Pile({ item, x, y, cut, px }: { item: Item; x: number; y: number; cut: Cut; px: number }) {
  const ing = item.ingredient;
  const match = miseFor(ing);
  if (match) return <MiseArt match={match} cut={cut} x={x} y={y} pxPerCm={px} max={78} />;
  return <Scattered item={{ ...item, cut: true }} cx={x} cy={y} rx={28} ry={11} color={ing.token.color} keep={1.4} size={0.85} />;
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

/** The knife's line through the food: what lies ahead of it is still whole, what lies behind is cut. */
function halves(kx: number, ky: number) {
  const big = 600;
  const side = (sign: number) =>
    `M${kx - DIR.x * big} ${ky - DIR.y * big}L${kx + DIR.x * big} ${ky + DIR.y * big}L${kx + DIR.x * big + sign * NORMAL.x * big} ${ky + DIR.y * big + sign * NORMAL.y * big}L${kx - DIR.x * big + sign * NORMAL.x * big} ${ky - DIR.y * big + sign * NORMAL.y * big}Z`;
  return { ahead: side(1), behind: side(-1) };
}

/** A mise ingredient under the knife: mise's whole drawing ahead of the blade, its cut pile behind it. */
function MiseCutting({ match, cut, progress, rock, technique, px }: { match: MiseMatch; cut: Cut; progress: number; rock: number; technique: Technique; px: number }) {
  const zoom = Math.min(1.2, Math.max(0.85, px / BOARD_PX_PER_CM));
  const { uid } = useStage();
  const st = STYLE[technique] ?? STYLE.chop;
  const reach = Math.max(miseSize(match, "whole", px), miseSize(match, cut, px)) * 0.36;
  const travel = -reach + progress * reach * 2;
  const kx = C.x + NORMAL.x * travel;
  const ky = C.y + NORMAL.y * travel;
  const { ahead, behind } = halves(kx, ky);
  return (
    <g>
      <clipPath id={`${uid}-ahead`}>
        <path d={ahead} />
      </clipPath>
      <clipPath id={`${uid}-behind`}>
        <path d={behind} />
      </clipPath>
      {/* Food under the knife never hangs past the board, and mise's ground shadow stays on it. */}
      <clipPath id={`${uid}-board`}>
        <path d={TOP} />
        <rect x={0} y={0} width={400} height={150} />
      </clipPath>
      <g clipPath={`url(#${uid}-board)`}>
        <g clipPath={`url(#${uid}-behind)`}>
          <MiseArt match={match} cut={cut} x={C.x} y={C.y} pxPerCm={px} />
        </g>
        <g clipPath={`url(#${uid}-ahead)`}>
          <MiseArt match={match} cut="whole" x={C.x} y={C.y} pxPerCm={px} />
        </g>
      </g>
      <Knife x={kx} y={ky} angle={-62} lift={rock * st.amp * zoom} rock={rock * st.amp * 0.7} zoom={zoom} />
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
  const cutOf = (ing: Ingredient) => cutFor(ing, technique, scene.step.text, miseFor(ing));
  const activeMatch = active ? miseFor(active.ingredient) : null;
  const px = active && activeMatch
    ? boardScale(activeMatch, cutOf(active.ingredient))
    : boardScale(waiting.map((it) => miseFor(it.ingredient)).find(Boolean) ?? null);
  const pastCut = (it: Item) =>
    it.cutIn ? cutFor(it.ingredient, it.cutIn.technique, it.cutIn.text, miseFor(it.ingredient)) : cutOf(it.ingredient);

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
            <Pile item={it} x={piles.length > 2 ? 84 + (k % 2) * 58 : 100 + (k % 2) * 6} y={piles.length > 2 ? 178 + Math.floor(k / 2) * 40 : 176 + k * 30} cut={pastCut(it)} px={px} />
          </motion.g>
        ))}
        {waiting.map((it, k) => (
          <motion.g key={`wait-${it.ingredient.id}`} {...landing(it.fresh, still, k + 1)}>
            {miseFor(it.ingredient) ? (
              <MiseArt
                match={miseFor(it.ingredient)!}
                cut="whole"
                x={Math.min(312 - k * 10, 352 - Math.min(110, miseSize(miseFor(it.ingredient)!, "whole", px)) * 0.42)}
                y={190 + k * 26}
                pxPerCm={px}
                max={110}
              />
            ) : (
              <g transform={`translate(${300 - k * 10} ${178 + k * 26}) scale(1.1) translate(-24 -24)`}>
                <TokenArt shape={it.ingredient.token.shape} color={it.ingredient.token.color} stroke={2.6} />
              </g>
            )}
          </motion.g>
        ))}
        {active && (
          <motion.g key={`cut-${active.ingredient.id}`} {...landing(active.fresh, still, 0, -150)}>
            {activeMatch ? (
              <MiseCutting match={activeMatch} cut={cutOf(active.ingredient)} progress={cut} rock={rock} technique={technique} px={px} />
            ) : (
              <Cutting ing={active.ingredient} technique={technique} cut={cut} rock={rock} />
            )}
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
