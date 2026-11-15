import { describe, expect, it } from "vitest";
import { buildRecipeRows, toStoredRecipe } from "./mapping";
import type { RecipeInput, RecipeRow } from "./mapping";

const ING_A = "11111111-1111-4111-8111-111111111111";
const ING_B = "22222222-2222-4222-8222-222222222222";

const row: RecipeRow = {
  id: "99999999-9999-4999-8999-999999999999",
  userId: null,
  cuisineId: null,
  title: "Toast",
  description: null,
  difficulty: "easy",
  prepMinutes: 1,
  cookMinutes: 3,
  servings: 2,
  imageUrl: null,
  sourceName: "Nan",
  sourceUrl: "https://example.com/toast",
  isPublic: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  cuisine: null,
  favoritedBy: [{ id: "f" }],
  ingredients: [
    {
      id: ING_A,
      recipeId: "r",
      position: 0,
      name: "bread",
      quantity: 2,
      unit: "slice",
      note: null,
      tokenShape: "cube",
      tokenColor: "#c90",
    },
  ],
  steps: [
    {
      id: "s1",
      recipeId: "r",
      position: 0,
      text: "Toast it",
      technique: "broil",
      heat: "high",
      timerSeconds: 90,
      timerMode: "stay",
      timerLabel: "Toasting",
      cue: null,
      ingredients: [
        { id: "u1", stepId: "s1", ingredientId: ING_A, portion: 1, note: null },
        { id: "u2", stepId: "s1", ingredientId: ING_B, portion: 0.5, note: "half" },
      ],
    },
    {
      id: "s2",
      recipeId: "r",
      position: 1,
      text: "Serve",
      technique: "plate",
      heat: null,
      timerSeconds: null,
      timerMode: null,
      timerLabel: null,
      cue: "golden",
      ingredients: [],
    },
  ],
};

describe("toStoredRecipe", () => {
  const recipe = toStoredRecipe(row);

  it("fills defaults for missing columns", () => {
    expect(recipe.description).toBe("");
    expect(recipe.cuisine).toBe("Other");
    expect(recipe.source).toEqual({ name: "Nan", url: "https://example.com/toast" });
  });

  it("keeps ingredient uuids and omits portion 1", () => {
    expect(recipe.ingredients[0]).toMatchObject({ id: ING_A, note: undefined, token: { shape: "cube", color: "#c90" } });
    expect(recipe.steps[0].uses).toEqual([
      { ingredientId: ING_A, portion: undefined, note: undefined },
      { ingredientId: ING_B, portion: 0.5, note: "half" },
    ]);
  });

  it("maps timers and optional step fields", () => {
    expect(recipe.steps[0].timer).toEqual({ seconds: 90, mode: "stay", label: "Toasting" });
    expect(recipe.steps[0].heat).toBe("high");
    expect(recipe.steps[1]).toMatchObject({ timer: undefined, heat: undefined, cue: "golden" });
  });

  it("carries ownership and viewer state", () => {
    expect(recipe).toMatchObject({ ownerId: null, isPublic: true, favorited: true });
  });
});

const input: RecipeInput = {
  title: " Pasta ",
  description: "",
  cuisine: "Italian",
  difficulty: "medium",
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  ingredients: [
    { id: "pasta", name: "pasta", quantity: 200, unit: "g", token: { shape: "strand", color: "#eb5" } },
    { id: "salt", name: "salt", quantity: null, unit: null, token: { shape: "grain", color: "#fff" } },
  ],
  steps: [
    {
      text: "Boil",
      technique: "boil",
      timer: { seconds: 600, mode: "stay", label: "Boil" },
      uses: [{ ingredientId: "pasta" }, { ingredientId: "salt", portion: 0.25 }],
    },
  ],
};

describe("buildRecipeRows", () => {
  it("replaces slug ids with fresh uuids and rewires step uses", () => {
    const rows = buildRecipeRows(input, "rid");
    const [pasta, salt] = rows.ingredients;
    expect(pasta.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(pasta.id).not.toBe("pasta");
    expect(rows.ingredients.every((i) => i.recipeId === "rid")).toBe(true);
    expect(rows.uses.map((u) => u.ingredientId)).toEqual([pasta.id, salt.id]);
    expect(rows.uses.map((u) => u.portion)).toEqual([1, 0.25]);
    expect(rows.uses.every((u) => u.stepId === rows.steps[0].id)).toBe(true);
  });

  it("trims the title and keeps order as position", () => {
    const rows = buildRecipeRows(input, "rid");
    expect(rows.fields.title).toBe("Pasta");
    expect(rows.ingredients.map((i) => i.position)).toEqual([0, 1]);
    expect(rows.steps[0]).toMatchObject({ timerSeconds: 600, timerMode: "stay", timerLabel: "Boil" });
  });

  it("falls back to the Other cuisine", () => {
    expect(buildRecipeRows({ ...input, cuisine: "  " }, "rid").cuisineName).toBe("Other");
  });

  it.each([
    ["empty title", { ...input, title: "  " }, /Title is required/],
    ["no steps", { ...input, steps: [] }, /at least one step/],
    [
      "unknown ingredient",
      { ...input, steps: [{ ...input.steps[0], uses: [{ ingredientId: "ghost" }] }] },
      /unknown ingredient "ghost"/,
    ],
    [
      "zero timer",
      { ...input, steps: [{ ...input.steps[0], timer: { seconds: 0, mode: "stay" as const, label: "x" } }] },
      /Timer must be longer/,
    ],
    [
      "duplicate ingredient id",
      { ...input, ingredients: [input.ingredients[0], input.ingredients[0]] },
      /Duplicate ingredient id/,
    ],
  ])("rejects %s with a readable error", (_name, bad, message) => {
    expect(() => buildRecipeRows(bad, "rid")).toThrow(message);
  });
});
