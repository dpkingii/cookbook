import type { Ingredient, StepUse } from "@/lib/recipe/types";

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.5, "½"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

export function formatQuantity(q: number): string {
  const whole = Math.floor(q);
  const rest = q - whole;
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.04);
  if (frac) return `${whole || ""}${frac[1]}`;
  return String(Math.round(q * 10) / 10);
}

export function formatAmount(ingredient: Ingredient, portion = 1): string {
  if (ingredient.quantity === null || portion === 0) return "";
  const q = formatQuantity(ingredient.quantity * portion);
  return ingredient.unit ? `${q} ${ingredient.unit}` : q;
}

export function describeUse(use: StepUse, ingredient: Ingredient) {
  return {
    amount: formatAmount(ingredient, use.portion ?? 1),
    name: ingredient.name,
    note: use.note,
  };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
