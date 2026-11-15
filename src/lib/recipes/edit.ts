import { detectHeat, detectTechnique } from "@/lib/import/technique";
import { detectTimer } from "@/lib/import/timer";
import { parseIngredientLine } from "@/lib/import/ingredient";
import { guessToken } from "@/lib/import/tokens";
import { formatQuantity, type FormState, type IngredientForm, type StepForm, type Token } from "./form";

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list as T[];
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function setIngredientName(ing: IngredientForm, name: string): IngredientForm {
  return { ...ing, name, token: ing.tokenLocked ? ing.token : guessToken(name) };
}

export function setIngredientToken(ing: IngredientForm, token: Token): IngredientForm {
  return { ...ing, token, tokenLocked: true };
}

export function removeIngredient(form: FormState, id: string): FormState {
  return {
    ...form,
    ingredients: form.ingredients.filter((ing) => ing.id !== id),
    steps: form.steps.map((step) => ({ ...step, uses: step.uses.filter((use) => use.ingredientId !== id) })),
  };
}

export type UseMode = "off" | "new" | "earlier";

export function modeOf(step: StepForm, ingredientId: string): UseMode {
  const use = step.uses.find((u) => u.ingredientId === ingredientId);
  if (!use) return "off";
  return use.portion === 0 ? "earlier" : "new";
}

export function setUse(step: StepForm, ingredientId: string, mode: UseMode): StepForm {
  const existing = step.uses.find((u) => u.ingredientId === ingredientId);
  const others = step.uses.filter((u) => u.ingredientId !== ingredientId);
  if (mode === "off") return { ...step, uses: others };
  if (mode === "earlier") return { ...step, uses: [...others, { ingredientId, portion: 0 }] };
  const portion = existing?.portion;
  const kept = portion && portion > 0 ? { ingredientId, portion } : { ingredientId };
  const uses = existing ? step.uses.map((u) => (u.ingredientId === ingredientId ? kept : u)) : [...step.uses, kept];
  return { ...step, uses };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ingredient";
}

export function ingredientsFromLines(text: string, takenIds: readonly string[]): IngredientForm[] {
  const taken = new Set(takenIds);
  const rows: IngredientForm[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = parseIngredientLine(line);
    if (!parsed.name) continue;
    const base = slug(parsed.name);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    rows.push({
      id,
      quantity: formatQuantity(parsed.quantity),
      unit: parsed.unit ?? "",
      name: parsed.name,
      note: parsed.note ?? "",
      token: guessToken(parsed.name),
      tokenLocked: false,
    });
  }
  return rows;
}

export function guessStep(step: StepForm): StepForm {
  const technique = detectTechnique(step.text);
  const next: StepForm = { ...step, technique, heat: detectHeat(step.text) ?? step.heat };
  const timer = detectTimer(step.text, technique);
  if (!timer) return next;
  return {
    ...next,
    timerOn: true,
    timerMinutes: String(Math.floor(timer.seconds / 60)),
    timerSeconds: String(timer.seconds % 60),
    timerMode: timer.mode,
    timerLabel: timer.label,
  };
}
