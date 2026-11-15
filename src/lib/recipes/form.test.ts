import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/recipe/types";
import { draftToForm, emptyForm, formToInput, formToRecipe, formatQuantity, parseQuantity } from "./form";

const draft: Omit<Recipe, "id"> = {
  title: "Garlic noodles",
  description: "Quick.",
  cuisine: "Chinese",
  difficulty: "easy",
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  source: { name: "example.com", url: "https://example.com/x" },
  ingredients: [
    { id: "noodles", name: "noodles", quantity: 200, unit: "g", token: { shape: "strand", color: "#f3ead6" } },
    { id: "garlic", name: "garlic", quantity: 0.5, unit: null, note: "minced", token: { shape: "wedge", color: "#111111" } },
  ],
  steps: [
    {
      text: "Boil the noodles for 8 minutes.",
      technique: "boil",
      heat: "high",
      timer: { seconds: 495, mode: "stay", label: "Noodles" },
      cue: "Al dente",
      uses: [{ ingredientId: "noodles" }],
    },
    { text: "Toss with garlic.", technique: "whisk", uses: [{ ingredientId: "garlic", portion: 0.5 }, { ingredientId: "noodles", portion: 0 }] },
  ],
};

describe("quantity text", () => {
  it("parses decimals, fractions and mixed numbers", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("0.5")).toBe(0.5);
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
  });

  it("returns NaN for text that is not a number", () => {
    expect(parseQuantity("lots")).toBeNaN();
    expect(parseQuantity("-1")).toBeNaN();
    expect(parseQuantity("1/0")).toBeNaN();
  });

  it("formats without float noise", () => {
    expect(formatQuantity(null)).toBe("");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(0.3333333)).toBe("0.333");
  });
});

describe("draftToForm / formToInput", () => {
  it("round-trips a recipe", () => {
    const input = formToInput(draftToForm(draft));
    expect(input).toEqual({ ...draft, isPublic: false });
  });

  it("splits timer seconds into minutes and seconds", () => {
    const step = draftToForm(draft).steps[0];
    expect([step.timerOn, step.timerMinutes, step.timerSeconds]).toEqual([true, "8", "15"]);
  });

  it("drops blank ingredient rows and uses of removed ingredients", () => {
    const form = draftToForm(draft);
    form.ingredients.push({ ...form.ingredients[0], id: "blank", name: "  ", quantity: "", unit: "", note: "" });
    form.steps[0].uses.push({ ingredientId: "blank" });
    const input = formToInput(form);
    expect(input.ingredients.map((i) => i.id)).toEqual(["noodles", "garlic"]);
    expect(input.steps[0].uses).toEqual([{ ingredientId: "noodles" }]);
  });

  it("omits timer and heat when switched off", () => {
    const form = draftToForm(draft);
    form.steps[0].timerOn = false;
    form.steps[0].heat = "";
    const step = formToInput(form).steps[0];
    expect(step.timer).toBeUndefined();
    expect(step.heat).toBeUndefined();
  });

  it("keeps the public flag and defaults new forms to private", () => {
    expect(emptyForm().isPublic).toBe(false);
    expect(formToInput({ ...draftToForm(draft), isPublic: true }).isPublic).toBe(true);
  });

  it("starts empty with one blank ingredient and one blank step", () => {
    const form = emptyForm();
    expect([form.ingredients.length, form.steps.length]).toEqual([1, 1]);
  });
});

describe("formToRecipe", () => {
  it("is lenient so a half-written recipe can still be previewed", () => {
    const form = emptyForm();
    form.steps[0].technique = "fry";
    const recipe = formToRecipe(form);
    expect(recipe.steps).toHaveLength(1);
    expect(recipe.steps[0].technique).toBe("fry");
    expect(recipe.ingredients).toEqual([]);
  });
});
