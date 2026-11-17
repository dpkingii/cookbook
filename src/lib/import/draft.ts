import type { Difficulty, Ingredient, Recipe, Step } from "@/lib/recipe/types";
import { guessToken } from "./tokens";
import { parseIngredientLine } from "./ingredient";
import { consolidate } from "./consolidate";
import { attachUnusedIngredients, createStepContext, structureStep } from "./steps";
import type { RecipeDraft } from "./types";

export interface DraftInput {
  title: string;
  description?: string;
  cuisine?: string;
  servings?: number;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  totalMinutes?: number | null;
  source?: Recipe["source"];
  ingredientLines: string[];
  steps: { name?: string; text: string }[];
  warnings?: string[];
}

function slug(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return s || "ingredient";
}

export function buildIngredients(lines: string[]): Ingredient[] {
  const taken = new Set<string>();
  const out: Ingredient[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseIngredientLine(line);
    if (!parsed.name) continue;
    const base = slug(parsed.name);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    out.push({
      id,
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      ...(parsed.note && { note: parsed.note }),
      token: guessToken(parsed.name),
    });
  }
  return out;
}

function noteRepeatedIngredients(ingredients: Ingredient[], steps: Step[]): void {
  const groups = new Map<string, Ingredient[]>();
  for (const ing of ingredients) {
    const key = ing.name.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), ing]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const at = group.map((ing) => {
      const fresh = steps.findIndex((s) => s.uses.some((u) => u.ingredientId === ing.id && u.portion !== 0));
      return fresh >= 0 ? fresh : steps.findIndex((s) => s.uses.some((u) => u.ingredientId === ing.id));
    });
    if (at.includes(-1) || new Set(at).size !== group.length) continue;
    group.forEach((ing, i) => {
      ing.note = ing.note ? `${ing.note}, for step ${at[i] + 1}` : `for step ${at[i] + 1}`;
    });
  }
}

export function summarise(description: string): string {
  const d = description.replace(/\s+/g, " ").trim();
  if (d.length <= 200) return d;
  const head = d.slice(0, 200);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (end > 0) return head.slice(0, end + 1);
  if (/[.!?]$/.test(head)) return head;
  const space = head.lastIndexOf(" ", 199);
  return `${head.slice(0, space > 0 ? space : 199).replace(/[\s,;:]+$/, "")}…`;
}

function difficultyOf(steps: number, ingredients: number): Difficulty {
  if (steps >= 14 || ingredients >= 18) return "hard";
  if (steps <= 8 && ingredients <= 10) return "easy";
  return "medium";
}

export function buildDraft(input: DraftInput): RecipeDraft {
  const ingredients = buildIngredients(input.ingredientLines);
  const build = (lenient: boolean) => {
    const context = createStepContext(lenient);
    context.warnings.push(...(input.warnings ?? []));
    return { context, steps: consolidate(input.steps.flatMap((s) => structureStep(s.text, ingredients, context, s.name))) };
  };
  let { context: ctx, steps }: { context: ReturnType<typeof createStepContext>; steps: Step[] } = build(false);
  if (!steps.length) ({ context: ctx, steps } = build(true));
  if (!steps.length) {
    ctx.warnings.push("No steps were found, so a placeholder step was added.");
    steps.push({ text: "Follow the original recipe.", technique: "rest", uses: [] });
  }
  if (!ingredients.length) ctx.warnings.push("No ingredients were found.");
  attachUnusedIngredients(steps, ingredients, ctx);
  noteRepeatedIngredients(ingredients, steps);

  const timerMinutes = Math.round(steps.reduce((sum, s) => sum + (s.timer?.seconds ?? 0), 0) / 60);
  let prep = input.prepMinutes ?? null;
  let cook = input.cookMinutes ?? null;
  const total = input.totalMinutes ?? null;
  if (prep === null && cook === null) {
    if (total !== null) [prep, cook] = [0, total];
    else [prep, cook] = [0, timerMinutes];
  } else if (prep === null) prep = total !== null ? Math.max(0, total - cook!) : 0;
  else if (cook === null) cook = total !== null ? Math.max(0, total - prep) : timerMinutes;

  return {
    title: input.title.trim() || "Untitled recipe",
    description: summarise(input.description ?? ""),
    cuisine: input.cuisine?.trim() || "Other",
    difficulty: difficultyOf(steps.length, ingredients.length),
    servings: input.servings && input.servings > 0 ? Math.round(input.servings) : 2,
    prepMinutes: prep!,
    cookMinutes: cook!,
    ...(input.source && { source: input.source }),
    ingredients,
    steps,
    warnings: ctx.warnings,
  };
}
