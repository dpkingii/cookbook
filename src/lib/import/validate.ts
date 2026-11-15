import { TECHNIQUES } from "@/lib/recipe/types";
import type { RecipeDraft } from "./types";

export function validateDraft(draft: RecipeDraft): string[] {
  const problems: string[] = [];
  if (!draft.title.trim()) problems.push("empty title");
  if (draft.steps.length < 1) problems.push("no steps");

  const ids = new Set<string>();
  for (const ing of draft.ingredients) {
    if (!ing.id) problems.push("ingredient without id");
    if (ids.has(ing.id)) problems.push(`duplicate ingredient id ${ing.id}`);
    ids.add(ing.id);
  }

  draft.steps.forEach((step, i) => {
    if (!step.text.trim()) problems.push(`step ${i + 1} has no text`);
    if (!TECHNIQUES.includes(step.technique)) problems.push(`step ${i + 1} has invalid technique ${step.technique}`);
    for (const use of step.uses) {
      if (!ids.has(use.ingredientId)) problems.push(`step ${i + 1} uses unknown ingredient ${use.ingredientId}`);
    }
  });
  return problems;
}
