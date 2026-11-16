"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { Burner, Knob } from "../Burner";
import { cookedColor, poolOf, Scattered } from "../food";
import { clamp01, HEX, lerp, LINE, mix, WATER } from "../palette";
import { ellipse, wall } from "../rough";
import { Bubbles, Steam } from "../Steam";
import s from "../stage.module.css";
import { Colander } from "./Colander";

const CX = 200;
const RIM = { y: 100, rx: 96, ry: 26 };
const BASE = { y: 232, rx: 92, ry: 24 };
const SURF = { cy: 112, rx: 82, ry: 17 };
const PIVOT = { x: 200, y: 166 };
const HANDLES = ["M106 120C82 114 80 142 106 144", "M294 120C318 114 320 142 294 144"];

/** Spaghetti standing in the pot, leaning on the rim; `soft` bends it over and sinks it. */
function Strands({ item, soft }: { item: Item; soft: number }) {
  const color = mix(cookedColor(item.ingredient, item.cooked), WATER, soft * 0.35);
  const paths = Array.from({ length: 9 }, (_, k) => {
    const bx = CX - 22 + k * 5.5;
    const by = SURF.cy - 2 + (k % 3) * 2.5;
    const th = ((14 + k * 3.5) * Math.PI) / 180;
    const L = 92 - (k % 2) * 8;
    const sx = bx + L * Math.sin(th);
    const sy = by - L * Math.cos(th);
    const fx = bx + 34 + k * 3 - (k % 2) * 60;
    const fy = by + 4 + (k % 3) * 2;
    const ex = lerp(sx, fx, soft);
    const ey = lerp(sy, fy, soft);
    const c1x = bx + L * 0.45 * Math.sin(th) * (1 + soft * 0.6);
    const c1y = by - L * 0.5 * Math.cos(th) * (1 - soft * 0.95);
    return `M${bx.toFixed(1)} ${by.toFixed(1)}Q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  });
  return (
    <g>
      {paths.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={HEX.ink} strokeWidth={5.6} strokeLinecap="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

function Sprinkle({ color }: { color: string }) {
  return (
    <g aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} transform={`translate(${CX - 18 + i * 6} ${62 + (i % 3) * 7})`}>
          <rect
            className={s.fall}
            x={-2.4}
            y={-2.4}
            width={4.8}
            height={4.8}
            rx={0.8}
            fill={color}
            stroke={HEX.ink}
            strokeWidth={1.3}
            style={{ animationDuration: "1.6s", animationDelay: `${-i * 0.23}s` }}
          />
        </g>
      ))}
    </g>
  );
}

export function Pot({ scene }: { scene: Scene }) {
  const { uid, still } = useStage();
  const { technique, heat, items, progress, water } = scene;
  const drain = technique === "drain";
  const boil = technique === "boil";
  const intensity = boil ? (scene.warmed ? 1 : Math.max(0.08, progress ?? 0.08)) : heat ? 0.3 : 0;
  const pool = water ? null : poolOf(items);
  const surface = water ? WATER : (pool?.color ?? HEX.grey);
  const strands = items.filter((it) => it.ingredient.token.shape === "strand");
  const grains = items.filter((it) => it.fresh && it.ingredient.token.shape === "grain");
  const floaters = items.filter((it) => !["strand", "grain", "liquid", "round"].includes(it.ingredient.token.shape));
  const clip = `${uid}-pot`;
  const hasSurface = water || pool;

  return (
    <g>
      <g className={s.ease} style={{ opacity: drain ? 0 : 1 }}>
        <Burner cx={CX} cy={254} rx={92} heat={heat} />
      </g>
      <Knob heat={heat} />
      <AnimatePresence>{drain && <Colander key="colander" items={items} />}</AnimatePresence>

      <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
        <g
          className={s.ease}
          style={{ transform: drain ? "translate(72px, -26px) rotate(-40deg)" : "translate(0px, 0px) rotate(0deg)" }}
        >
          <g transform={`translate(${-PIVOT.x} ${-PIVOT.y})`}>
            {HANDLES.map((d) => (
              <g key={d}>
                <path d={d} fill="none" stroke={HEX.ink} strokeWidth={9} strokeLinecap="round" />
                <path d={d} fill="none" stroke={HEX.white} strokeWidth={9 - LINE.main * 2} strokeLinecap="round" />
              </g>
            ))}
            <path d={wall(CX, RIM, BASE, RIM.ry)} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
            <path d={`M${CX - 95} 136Q${CX} 160 ${CX + 95} 136`} fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
            <path d={ellipse(CX, RIM.y, RIM.rx, RIM.ry)} fill={HEX.white} />
            <clipPath id={clip}>
              <ellipse cx={CX} cy={RIM.y + 1} rx={RIM.rx - 6} ry={RIM.ry - 4} />
            </clipPath>
            <ellipse cx={CX} cy={RIM.y + 1} rx={RIM.rx - 6} ry={RIM.ry - 4} fill={HEX.light} stroke={HEX.ink} strokeWidth={LINE.detail} />
            <g clipPath={`url(#${clip})`} className={s.ease} style={{ opacity: drain ? 0 : 1 }}>
              {hasSurface && (
                <>
                  <ellipse cx={CX} cy={SURF.cy} rx={SURF.rx + 8} ry={SURF.ry + 6} fill={surface} />
                  <path d={`M${CX - 90} ${SURF.cy - 14}Q${CX} ${SURF.cy - 26} ${CX + 90} ${SURF.cy - 14}`} fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
                </>
              )}
              <AnimatePresence>
                {floaters.map((it, k) => (
                  <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k)}>
                    <Scattered item={it} cx={CX} cy={SURF.cy + 2} rx={SURF.rx - 16} ry={SURF.ry - 4} color={cookedColor(it.ingredient, it.cooked)} />
                  </motion.g>
                ))}
              </AnimatePresence>
              {intensity > 0 && hasSurface && (
                <Bubbles
                  cx={CX}
                  cy={SURF.cy + 3}
                  rx={SURF.rx - 6}
                  ry={SURF.ry - 3}
                  n={3 + Math.round(intensity * 9)}
                  r={1.8 + intensity * 4.5}
                  period={boil ? 1.6 - intensity * 1.0 : 2.6}
                  seed={5}
                />
              )}
            </g>
            <ellipse cx={CX} cy={RIM.y} rx={RIM.rx} ry={RIM.ry} fill="none" stroke={HEX.ink} strokeWidth={LINE.main} />
            <AnimatePresence>
              {!drain &&
                strands.map((it, k) => (
                  <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k, -140)}>
                    <Strands item={it} soft={clamp01(it.cooked)} />
                  </motion.g>
                ))}
            </AnimatePresence>
          </g>
        </g>
      </g>

      {!drain && grains.length > 0 && <Sprinkle color={grains[0].ingredient.token.color} />}
      {!drain && intensity > 0.75 && (
        <g aria-hidden>
          {[-1, 1, 0.4].map((dx, i) => (
            <g key={i} transform={`translate(${CX - 30 + i * 32} ${SURF.cy - 4})`}>
              <circle className={s.splash} r={2.6} fill={WATER} stroke={HEX.ink} strokeWidth={1.3} style={{ ["--dx" as string]: `${dx * 7}px`, animationDelay: `${-i * 0.31}s` }} />
            </g>
          ))}
        </g>
      )}
      {!drain && heat && (
        <Steam x={CX} y={RIM.y - 14} width={150} amount={clamp01(0.15 + intensity * 0.85)} size={boil ? 1.3 + intensity * 0.4 : 1} />
      )}
    </g>
  );
}
