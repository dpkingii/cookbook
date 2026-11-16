"use client";

import { AnimatePresence, motion } from "motion/react";
import type { TokenShape } from "@/lib/recipe/types";
import type { Item, Scene } from "../contents";
import { landing, useClock, useStage } from "../context";
import { Scattered } from "../food";
import { blendOf } from "../mixing";
import { HEX, LINE, mix } from "../palette";
import { blob, ellipse } from "../rough";
import s from "../stage.module.css";
import { Knead } from "./Knead";
import { Marble, Patches, Specks, Swirl, type Surface } from "./Mixture";
import { Spatula, Whisk } from "./Utensils";

const CX = 196;
const RIM = { y: 150, rx: 130, ry: 40 };
const LIP = { rx: 121, ry: 34 };
const SURF: Surface = { cx: CX, cy: 166, rx: 104, ry: 24 };
const BODY = `M66 150C68 214 120 262 196 263C272 262 324 214 326 150A130 40 0 0 1 66 150Z`;
const FOOT = "M146 254Q196 268 246 254L242 268Q196 280 150 268Z";
const STIRRED = new Set<TokenShape>(["liquid", "round", "grain"]);

/** Cut things and the meat being marinated stay in pieces; the rest goes into the mix. */
function isPiece(it: Item, marinating: boolean, used: Set<string>): boolean {
  const shape = it.ingredient.token.shape;
  if (STIRRED.has(shape)) return false;
  return shape !== "cube" || it.cut || (marinating && used.has(it.ingredient.id));
}

function Vessel({ children }: { children: React.ReactNode }) {
  const { uid } = useStage();
  const clip = `${uid}-bowl`;
  return (
    <g>
      <path d={FOOT} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d={BODY} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
      <path d="M78 192Q196 244 314 192" fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
      <path d={ellipse(CX, RIM.y, RIM.rx, RIM.ry)} fill={HEX.white} />
      <path d={ellipse(CX, RIM.y + 1, LIP.rx, LIP.ry)} fill={HEX.light} />
      <clipPath id={clip}>
        <path d={ellipse(CX, RIM.y + 1, LIP.rx, LIP.ry)} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>{children}</g>
      <path d={ellipse(CX, RIM.y + 1, LIP.rx, LIP.ry)} fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
      <path d={ellipse(CX, RIM.y, RIM.rx, RIM.ry)} fill="none" stroke={HEX.ink} strokeWidth={LINE.main} />
    </g>
  );
}

/** Liquids poured in from above and spices shaken in, once, as the step begins. */
function Arrivals({ items }: { items: Item[] }) {
  const pours = items.filter((it) => it.ingredient.token.shape === "liquid" || it.ingredient.token.shape === "round").slice(0, 3);
  const shakes = items.filter((it) => it.ingredient.token.shape === "grain").slice(0, 3);
  return (
    <g aria-hidden>
      {pours.map((it, k) => {
        const x = CX - 30 + k * 30;
        return (
          <motion.path
            key={it.ingredient.id}
            d={`M${x + 8} -10C${x} 70 ${x + 12} 120 ${x} ${SURF.cy}`}
            fill="none"
            stroke={it.ingredient.token.color}
            strokeWidth={8}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.1, times: [0, 0.1, 0.7, 1], delay: 0.2 + k * 0.55 }}
          />
        );
      })}
      {shakes.flatMap((it, k) =>
        Array.from({ length: 6 }, (_, i) => (
          <motion.rect
            key={`${it.ingredient.id}-${i}`}
            x={CX + 20 - k * 26 + (i % 3) * 7}
            y={SURF.cy - 4 + (i % 2) * 5}
            width={4.4}
            height={4.4}
            rx={0.8}
            fill={it.ingredient.token.color}
            stroke={HEX.ink}
            strokeWidth={1.2}
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: [-150, 0, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.3, times: [0, 0.7, 1], delay: 0.5 + k * 0.4 + i * 0.07 }}
          />
        )),
      )}
    </g>
  );
}

function Mixing({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const { technique, items, progress } = scene;
  const used = new Set(scene.uses.map((u) => u.id));
  const marinate = technique === "marinate";
  const whisk = technique === "whisk";
  const fold = technique === "fold";
  const pieces = items.filter((it) => isPiece(it, marinate, used));
  const sauce = items.filter((it) => !pieces.includes(it));
  const fresh = sauce.filter((it) => it.fresh);
  const old = sauce.filter((it) => !it.fresh);
  const final = blendOf(sauce) ?? HEX.light;
  const p = progress ?? (whisk ? 0.7 : fold ? 0.5 : 0.35);

  const running = !still && (whisk || fold) && items.length > 0;
  const t = useClock(running);
  const lead = old.length ? old : sauce.slice(0, 1);
  const added = old.length ? fresh : sauce.slice(1);
  const start = blendOf(lead) ?? final;

  const soak = marinate ? p : 0;
  const level = marinate ? 0.94 - soak * 0.2 : 1;
  const surfColor = marinate
    ? mix(final, HEX.ink, soak * 0.2)
    : fold
      ? mix(start, final, p * 0.55)
      : mix(start, final, p);
  const f = { ...SURF, rx: SURF.rx * level, ry: SURF.ry * level, cy: SURF.cy + (1 - level) * 10 };
  const surfD = marinate ? blob(f.cx, f.cy, f.rx, f.ry, 404, 0.06, 11) : ellipse(f.cx, f.cy, f.rx + 20, f.ry + 12);

  const a = running ? (t * Math.PI * 2) / (whisk ? 0.6 : 3.4) : 0.9;
  const tip = { x: CX + Math.cos(a) * (whisk ? 46 : 54), y: f.cy + 2 + Math.sin(a) * (whisk ? 11 : 13) };
  const spin = running ? (whisk ? -t * 330 : -t * 40) : -20;

  return (
    <>
      <Vessel>
        {sauce.length > 0 && (
          <motion.g key="mix" {...landing(old.length === 0, still, 0, -24)}>
            <path d={surfD} fill={surfColor} stroke={HEX.ink} strokeWidth={2} />
            {whisk && <Swirl f={f} items={sauce} blend={p} final={final} deg={spin} />}
            {whisk && <Patches f={f} items={added} blend={p} final={final} />}
            {fold && added.length > 0 && (
              <Marble f={f} color={blendOf(added) ?? final} final={final} p={p} deg={spin} id={added[0].ingredient.id} />
            )}
            {!marinate && <Specks f={f} items={sauce.filter((it) => it.ingredient.token.shape === "grain")} blend={p} />}
            {marinate &&
              [0, 1, 2].map((i) => (
                <path
                  key={i}
                  className={s.shimmer}
                  style={{ animationDuration: "4.8s", animationDelay: `${-i * 1.6}s` }}
                  d={`M${f.cx - 70 + i * 52} ${f.cy + 8 - (i % 2) * 14}q9 -4 18 0`}
                  fill="none"
                  stroke={mix(final, HEX.white, 0.55)}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              ))}
          </motion.g>
        )}
        <AnimatePresence>
          {pieces.map((it, k) => {
            const main = marinate && used.has(it.ingredient.id);
            const color = main
              ? mix(mix(it.ingredient.token.color, final, 0.12 + soak * 0.5), HEX.ink, soak * 0.14)
              : it.ingredient.token.color;
            return (
              <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k)}>
                <g className={marinate ? s.breathe : undefined} style={{ animationDelay: `${-k * 1.3}s` }}>
                  <Scattered
                    item={main ? { ...it, cut: true } : it}
                    cx={f.cx}
                    cy={f.cy - 2}
                    rx={f.rx * (main ? 0.82 : 0.7)}
                    ry={f.ry * (main ? 0.7 : 0.6)}
                    color={color}
                    size={main ? 1.9 : 0.8}
                    keep={main ? 1.25 : 0.8}
                  />
                </g>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </Vessel>
      {whisk && sauce.length > 0 && (
        <g>
          <Whisk x={tip.x} y={tip.y} angle={26 + Math.cos(a) * 8} />
          <ellipse cx={tip.x} cy={tip.y - 3} rx={19} ry={5.5} fill={surfColor} stroke={HEX.ink} strokeWidth={2} />
        </g>
      )}
      {fold && sauce.length > 0 && (
        <g>
          <Spatula x={tip.x} y={tip.y + 2} angle={18 + Math.sin(a) * 22} turn={(Math.sin(a) + 1) / 2} />
          <ellipse cx={tip.x} cy={tip.y - 1} rx={20} ry={5} fill={surfColor} stroke={HEX.ink} strokeWidth={2} />
        </g>
      )}
      {!still && <Arrivals items={fresh} />}
    </>
  );
}

export function Bowl({ scene }: { scene: Scene }) {
  const { still } = useStage();
  const knead = scene.technique === "knead";
  const fade = { initial: still ? false : { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: still ? 0 : 0.5 } } as const;
  return (
    <AnimatePresence initial={false}>
      {knead ? (
        <motion.g key="knead" {...fade}>
          <Knead scene={scene} />
        </motion.g>
      ) : (
        <motion.g key="bowl" {...fade}>
          <Mixing scene={scene} />
        </motion.g>
      )}
    </AnimatePresence>
  );
}
