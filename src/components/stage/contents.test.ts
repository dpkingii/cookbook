import { describe, expect, it } from "vitest";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import type { Recipe } from "@/lib/recipe/types";
import { sceneAt } from "./contents";
import { isEgg, isStaple, poolOf, poolsUp } from "./food";

const friedRice = SEED_RECIPES.find((r) => r.id === "lau-egg-fried-rice")!;
const vessels = (r: Recipe) => r.steps.map((_, i) => sceneAt(r, i, 0.5).vessel);

describe("scenes", () => {
  it("cooks rice in the rice cooker and keeps it there to steam and fluff", () => {
    expect(vessels(friedRice)).toEqual(["cooker", "board", "bowl", "cooker", "microwave", "cooker", "pan", "pan", "pan", "pan", "pan", "plate"]);
  });

  it("counts appliance time as cooking, so the rice is done by the time it steams", () => {
    const rice = sceneAt(friedRice, 3, null).items.find((it) => it.ingredient.id === "rice")!;
    expect(rice.cooked).toBe(1);
  });

  it("marks food tipped onto a plate as carried, so it is not drawn falling as garnish", () => {
    const plate = sceneAt(friedRice, friedRice.steps.length - 1, null);
    expect(plate.items.length).toBeGreaterThan(3);
    expect(plate.items.every((it) => it.carried)).toBe(true);
  });

  it("still plates a rest step whose food is not in an appliance", () => {
    const r: Recipe = {
      ...friedRice,
      steps: [
        { text: "Sear the steak.", technique: "sear", heat: "high", uses: [{ ingredientId: "eggs" }] },
        { text: "Let it rest.", technique: "rest", uses: [{ ingredientId: "eggs" }] },
      ],
    };
    expect(vessels(r)).toEqual(["pan", "plate"]);
  });

  it("tells eggs and staples apart from the shapes they share", () => {
    const ing = (name: string, shape: "round" | "grain", unit: string | null = null) => ({ id: name, name, quantity: 1, unit, token: { shape, color: "#fff" } });
    expect(isEgg(ing("large eggs", "round"))).toBe(true);
    expect(isEgg(ing("eggplant", "round"))).toBe(false);
    expect(isEgg(ing("cherry tomatoes", "round"))).toBe(false);
    expect(isStaple(ing("jasmine rice", "grain", "rice cups"))).toBe(true);
    expect(isStaple(ing("salt", "grain", "tsp"))).toBe(false);
  });

  it("reduces only tomatoes to sauce; peas, chickpeas, lemons and broccoli stay pieces", () => {
    const ing = (name: string, shape: "round" | "liquid") => ({ id: name, name, quantity: 1, unit: null, token: { shape, color: "#a9cfe0" } });
    expect(["crushed tomatoes", "eggs", "water"].map((n) => poolsUp(ing(n, n === "water" ? "liquid" : "round")))).toEqual([true, true, true]);
    expect(["frozen peas", "chickpeas, drained", "lemon", "broccoli"].some((n) => poolsUp(ing(n, "round")))).toBe(false);
  });

  it("turns water cooked with the food into a clear glaze, not blue water", () => {
    const water = { id: "w", name: "water", quantity: 1, unit: null, token: { shape: "liquid" as const, color: "#a9cfe0" } };
    const at = (cooked: number) => poolOf([{ ingredient: water, fresh: false, cut: false, since: 0, cooked, carried: false, cutIn: null }])!.color;
    expect(at(0)).toBe("#a9cfe0");
    expect(at(1)).not.toBe("#a9cfe0");
  });
});
