import type { Difficulty, Heat, Recipe, Step, StepUse, Technique, TokenShape } from "@/lib/recipe/types";
import type { RecipeInput } from "@/lib/db/recipes";

export type Token = { shape: TokenShape; color: string };

export interface IngredientForm {
  id: string;
  quantity: string;
  unit: string;
  name: string;
  note: string;
  token: Token;
  /** True once the person picked the token by hand, so renaming no longer re-guesses it. */
  tokenLocked: boolean;
}

export interface StepForm {
  key: string;
  text: string;
  technique: Technique;
  heat: Heat | "";
  timerOn: boolean;
  timerMinutes: string;
  timerSeconds: string;
  timerMode: "stay" | "background";
  timerLabel: string;
  cue: string;
  uses: StepUse[];
}

export interface FormState {
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty;
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
  isPublic: boolean;
  source?: { name: string; url: string };
  ingredients: IngredientForm[];
  steps: StepForm[];
}

let counter = 0;
export const nextKey = () => `k${++counter}`;

export function parseQuantity(text: string): number | null {
  const s = text.trim();
  if (!s) return null;
  const mixed = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator === 0 ? NaN : Number(mixed[1] ?? 0) + Number(mixed[2]) / denominator;
  }
  return /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export function formatQuantity(q: number | null): string {
  return q === null ? "" : String(Math.round(q * 1000) / 1000);
}

export function blankIngredient(): IngredientForm {
  return {
    id: `ing-${nextKey()}`,
    quantity: "",
    unit: "",
    name: "",
    note: "",
    token: { shape: "round", color: "#c9bfae" },
    tokenLocked: false,
  };
}

export function blankStep(): StepForm {
  return {
    key: nextKey(),
    text: "",
    technique: "chop",
    heat: "",
    timerOn: false,
    timerMinutes: "",
    timerSeconds: "",
    timerMode: "stay",
    timerLabel: "",
    cue: "",
    uses: [],
  };
}

export function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    cuisine: "",
    difficulty: "easy",
    servings: "2",
    prepMinutes: "",
    cookMinutes: "",
    isPublic: false,
    ingredients: [blankIngredient()],
    steps: [blankStep()],
  };
}

type Source = Omit<Recipe, "id"> & { isPublic?: boolean };

export function draftToForm(recipe: Source): FormState {
  return {
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    servings: String(recipe.servings),
    prepMinutes: String(recipe.prepMinutes),
    cookMinutes: String(recipe.cookMinutes),
    isPublic: recipe.isPublic ?? false,
    source: recipe.source,
    ingredients: recipe.ingredients.map((ing) => ({
      id: ing.id,
      quantity: formatQuantity(ing.quantity),
      unit: ing.unit ?? "",
      name: ing.name,
      note: ing.note ?? "",
      token: { ...ing.token },
      tokenLocked: true,
    })),
    steps: recipe.steps.map((step) => ({
      key: nextKey(),
      text: step.text,
      technique: step.technique,
      heat: step.heat ?? "",
      timerOn: Boolean(step.timer),
      timerMinutes: step.timer ? String(Math.floor(step.timer.seconds / 60)) : "",
      timerSeconds: step.timer ? String(step.timer.seconds % 60) : "",
      timerMode: step.timer?.mode ?? "stay",
      timerLabel: step.timer?.label ?? "",
      cue: step.cue ?? "",
      uses: step.uses.map((use) => ({ ...use })),
    })),
  };
}

export function isBlankIngredient(ing: IngredientForm): boolean {
  return !ing.name.trim() && !ing.quantity.trim() && !ing.unit.trim() && !ing.note.trim();
}

export function timerSecondsOf(step: StepForm): number {
  return (Number(step.timerMinutes) || 0) * 60 + (Number(step.timerSeconds) || 0);
}

function toStep(step: StepForm, ids: Set<string>): Step {
  const seconds = timerSecondsOf(step);
  return {
    text: step.text,
    technique: step.technique,
    heat: step.heat || undefined,
    timer:
      step.timerOn && seconds > 0
        ? { seconds, mode: step.timerMode, label: step.timerLabel.trim() }
        : undefined,
    cue: step.cue.trim() || undefined,
    uses: step.uses.filter((use) => ids.has(use.ingredientId)).map((use) => ({ ...use })),
  };
}

function toIngredients(form: FormState) {
  return form.ingredients
    .filter((ing) => !isBlankIngredient(ing))
    .map((ing) => ({
      id: ing.id,
      name: ing.name.trim(),
      quantity: parseQuantity(ing.quantity) ?? null,
      unit: ing.unit.trim() || null,
      note: ing.note.trim() || undefined,
      token: { ...ing.token },
    }));
}

export function formToInput(form: FormState): RecipeInput {
  const ingredients = toIngredients(form);
  const ids = new Set(ingredients.map((ing) => ing.id));
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    cuisine: form.cuisine.trim(),
    difficulty: form.difficulty,
    servings: Number(form.servings),
    prepMinutes: Number(form.prepMinutes || 0),
    cookMinutes: Number(form.cookMinutes || 0),
    source: form.source,
    isPublic: form.isPublic,
    ingredients,
    steps: form.steps.map((step) => toStep(step, ids)),
  };
}

export function formToRecipe(form: FormState): Recipe {
  const ingredients = toIngredients(form).map((ing) => ({
    ...ing,
    quantity: Number.isNaN(ing.quantity) ? null : ing.quantity,
  }));
  const ids = new Set(ingredients.map((ing) => ing.id));
  return {
    id: "preview",
    title: form.title,
    description: form.description,
    cuisine: form.cuisine,
    difficulty: form.difficulty,
    servings: Number(form.servings) || 1,
    prepMinutes: 0,
    cookMinutes: 0,
    ingredients,
    steps: form.steps.map((step) => toStep(step, ids)),
  };
}

export function editableOf(recipe: Recipe & { isPublic?: boolean }): Source {
  return {
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    source: recipe.source,
    isPublic: recipe.isPublic,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

export type { Source as EditableRecipe };
