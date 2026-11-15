import { describe, expect, it } from "vitest";
import { SEED_RECIPES } from "./seed-recipes";
import { TECHNIQUES } from "./types";

describe("seed recipes", () => {
  it("have unique ids", () => {
    const ids = SEED_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SEED_RECIPES.map((r) => [r.title, r] as const))("%s is internally consistent", (_, recipe) => {
    const ids = recipe.ingredients.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(recipe.steps.length).toBeGreaterThan(0);

    const used = new Set<string>();
    for (const step of recipe.steps) {
      expect(TECHNIQUES).toContain(step.technique);
      expect(step.text.length).toBeGreaterThan(0);
      if (step.timer) expect(step.timer.seconds).toBeGreaterThan(0);
      for (const use of step.uses) {
        expect(ids, `${step.text} uses ${use.ingredientId}`).toContain(use.ingredientId);
        used.add(use.ingredientId);
      }
    }
    expect([...used].sort(), "every ingredient is used by some step").toEqual([...ids].sort());
  });
});
