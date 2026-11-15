import type { TokenShape } from "@/lib/recipe/types";
import type { Item } from "./contents";
import { clamp01, mix } from "./palette";

type Weights = Partial<Record<TokenShape, number>>;

/** A sauce is mostly its liquids; spices tint it, they don't paint it. */
export const SAUCE: Weights = { liquid: 1, round: 1.6, grain: 0.3, cube: 0.6 };
/** A dough is mostly its flour. */
export const DOUGH: Weights = { grain: 1, liquid: 0.25, round: 0.5 };

/** One colour for everything stirred together, heavier ingredients counting more. */
export function blendOf(items: Item[], weights: Weights = SAUCE): string | null {
  let acc: string | null = null;
  let total = 0;
  for (const it of items) {
    const w = weights[it.ingredient.token.shape] ?? 0.4;
    total += w;
    acc = acc ? mix(acc, it.ingredient.token.color, w / total) : it.ingredient.token.color;
  }
  return acc;
}

/** Browning for oven food: most of it in the first roast, the rest over later rounds. */
export function browned(cooked: number): number {
  return Math.pow(clamp01(cooked), 0.8) * 0.6 + clamp01((cooked - 1) / 3) * 0.4;
}
