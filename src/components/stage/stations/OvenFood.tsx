"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item, Scene } from "../contents";
import { landing, useStage } from "../context";
import { cookedColor, placements, Scattered } from "../food";
import { blendOf, browned } from "../mixing";
import { clamp01, HEX, INK, MIS, mix } from "../palette";
import { blob } from "../rough";
import { Bubbles } from "../Steam";

const ROAST = "#7a3b17";
const CRUST = "#b5682a";
const CHAR = "#2a1a12";
const TRAY_TOP = "M-90 0L-72 -38H72L90 0Z";
const TRAY_FRONT = "M-90 0H90L86 10H-86Z";
const TIN_FRONT = "M-60 -46H60L52 0H-52Z";
const TIN_BACK = "M-60 -46L-54 -54H54L60 -46Z";

const shapeOf = (it: Item) => it.ingredient.token.shape;

export function roastColor(it: Item, char: number): string {
  return mix(mix(cookedColor(it.ingredient, it.cooked), ROAST, browned(it.cooked) * 0.7), CHAR, char * 0.25);
}

/** Pieces on a sheet tray over their own drippings, browning and, under the broiler, charring. */
function Tray({ items, char, sizzle }: { items: Item[]; char: number; sizzle: boolean }) {
  const { still } = useStage();
  const liquids = items.filter((it) => shapeOf(it) === "liquid");
  const spices = items.filter((it) => shapeOf(it) === "grain");
  const pieces = items.filter((it) => shapeOf(it) !== "liquid" && shapeOf(it) !== "grain");
  const food = { cx: 0, cy: -19, rx: 62, ry: 12 };
  const drip = blendOf(liquids);
  const dripD = blob(0, -18, 72, 14, 31, 0.1, 10);
  const doneness = Math.max(0, ...pieces.map((it) => browned(it.cooked)));
  return (
    <g>
      <path d={TRAY_TOP} fill={mix(HEX.paper, HEX.ink, 0.48)} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={TRAY_TOP} fill="none" stroke={INK.paperDeep} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={TRAY_FRONT} fill={mix(HEX.paper, HEX.ink, 0.68)} stroke={INK.paperDeep} strokeWidth={2} strokeLinejoin="round" />
      {drip && (
        <motion.g {...landing(liquids.some((it) => it.fresh), still, 0, -20)}>
          <path d={dripD} fill={mix(drip, ROAST, 0.2 + doneness * 0.5)} />
          <path d={dripD} fill="none" stroke={INK.ink} strokeWidth={1.8} />
          {sizzle && <Bubbles cx={0} cy={-18} rx={62} ry={10} n={6} r={2.2} period={0.9} fill={INK.paper} seed={4} />}
        </motion.g>
      )}
      <AnimatePresence>
        {pieces.map((it, k) => {
          const cut = it.cut ? 1.6 : 1.45;
          return (
            <motion.g key={it.ingredient.id} {...landing(it.fresh, still, k, -90)}>
              {char > 0.02 && (
                <g opacity={clamp01(char * 1.2)}>
                  <Scattered item={it} {...food} color={CHAR} size={cut * 1.22} />
                </g>
              )}
              <Scattered item={it} {...food} color={roastColor(it, char)} size={cut} />
            </motion.g>
          );
        })}
      </AnimatePresence>
      {spices.flatMap((it) =>
        placements(it.ingredient.id + "rub", 10, 0, -20, 58, 10).map((p) => (
          <rect key={p.seed} x={p.x - 1.5} y={p.y - 1.5} width={3} height={3} rx={0.5} fill={it.ingredient.token.color} stroke={INK.ink} strokeWidth={0.8} />
        )),
      )}
    </g>
  );
}

/** Batter in a loaf tin, doming as it rises and taking a crust; the top splits once it has sprung. */
function Tin({ items }: { items: Item[] }) {
  const { still } = useStage();
  const cooked = Math.max(0, ...items.map((it) => it.cooked));
  const rise = clamp01(cooked);
  const batter = mix(blendOf(items) ?? "#efe0b8", HEX.paper, 0.3);
  const crust = mix(batter, CRUST, browned(cooked));
  const h = 8 + rise * 26;
  const dome = `M-58 -46C-56 ${-46 - h} 56 ${-46 - h} 58 -46Z`;
  return (
    <motion.g {...landing(items.some((it) => it.fresh), still, 0, -90)}>
      <g transform="scale(1.22)">
      <path d={TIN_BACK} fill={mix(HEX.paper, HEX.ink, 0.35)} stroke={INK.inkSoft} strokeWidth={2} strokeLinejoin="round" />
      <path d={dome} fill={crust} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={dome} fill="none" stroke={INK.ink} strokeWidth={2.8} />
      {rise > 0.35 && (
        <path
          d={`M-28 ${-46 - h * 0.62}Q0 ${-46 - h * 0.86} 28 ${-46 - h * 0.62}`}
          fill="none"
          stroke={batter}
          strokeWidth={2 + rise * 3}
          strokeLinecap="round"
        />
      )}
      <path d={TIN_FRONT} fill={INK.paperDeep} transform={`translate(${MIS.x} ${MIS.y})`} />
      <path d={TIN_FRONT} fill="none" stroke={INK.inkSoft} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M-56 -38H56" stroke={INK.tomato} strokeWidth={4} />
      <circle cx={-44} cy={-22} r={2.2} fill={INK.ink} />
      <circle cx={44} cy={-22} r={2.2} fill={INK.ink} />
      </g>
    </motion.g>
  );
}

/** What sits on the rack: a loaf tin for a batter bake, otherwise a sheet tray. Drawn around (0, 0). */
export function OvenFood({ scene, char }: { scene: Scene; char: number }) {
  const { items, technique, heat } = scene;
  const batter = technique === "bake" && items.length > 0 && items.every((it) => ["liquid", "round", "grain"].includes(shapeOf(it)));
  if (items.length === 0) return null;
  return batter ? <Tin items={items} /> : <Tray items={items} char={char} sizzle={heat != null && technique !== "broil"} />;
}

/** A thin pour from above the window onto the food, for a glaze or basting liquid added this step. */
export function Drizzle({ items, x, top, bottom }: { items: Item[]; x: number; top: number; bottom: number }) {
  const { still } = useStage();
  const pour = items.find((it) => it.fresh && shapeOf(it) === "liquid");
  if (!pour || still) return null;
  return (
    <motion.path
      d={`M${x + 10} ${top}C${x + 2} ${top + 40} ${x + 14} ${bottom - 30} ${x} ${bottom}`}
      fill="none"
      stroke={pour.ingredient.token.color}
      strokeWidth={6}
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.6, times: [0, 0.1, 0.7, 1], delay: 0.4 }}
    />
  );
}
