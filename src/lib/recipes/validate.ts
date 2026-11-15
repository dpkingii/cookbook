import { isBlankIngredient, parseQuantity, type FormState } from "./form";

export interface Issue {
  field: string;
  message: string;
}

const isWhole = (text: string) => /^\d+$/.test(text.trim());

export function validateForm(form: FormState): Issue[] {
  const issues: Issue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });

  if (!form.title.trim()) add("title", "Give the recipe a title");
  if (!isWhole(form.servings) || Number(form.servings) < 1) add("servings", "Servings must be a whole number, 1 or more");
  if (form.prepMinutes.trim() && !isWhole(form.prepMinutes)) add("prepMinutes", "Prep time must be whole minutes, 0 or more");
  if (form.cookMinutes.trim() && !isWhole(form.cookMinutes)) add("cookMinutes", "Cook time must be whole minutes, 0 or more");

  form.ingredients.forEach((ing, i) => {
    if (isBlankIngredient(ing)) return;
    if (!ing.name.trim()) add(`ingredient-${i}-name`, `Ingredient ${i + 1} needs a name`);
    if (Number.isNaN(parseQuantity(ing.quantity))) {
      add(`ingredient-${i}-quantity`, `Ingredient ${i + 1}: use a number such as 2, 1/2 or 1.5`);
    }
  });

  if (form.steps.length === 0) add("add-step", "Add at least one step");
  form.steps.forEach((step, i) => {
    if (!step.text.trim()) add(`step-${i}-text`, `Step ${i + 1} has no text`);
    if (!step.timerOn) return;
    const minutes = step.timerMinutes.trim();
    const seconds = step.timerSeconds.trim();
    if ((minutes && !isWhole(minutes)) || (seconds && !isWhole(seconds))) {
      add(`step-${i}-timer-minutes`, `Step ${i + 1}: timer minutes and seconds must be whole numbers`);
    } else if ((Number(minutes) || 0) * 60 + (Number(seconds) || 0) <= 0) {
      add(`step-${i}-timer-minutes`, `Step ${i + 1}: set the timer to at least 1 second, or turn it off`);
    }
  });

  return issues;
}
