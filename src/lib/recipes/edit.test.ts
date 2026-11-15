import { describe, expect, it } from "vitest";
import { emptyForm, type FormState, type IngredientForm } from "./form";
import {
  guessStep,
  ingredientsFromLines,
  moveItem,
  removeIngredient,
  setIngredientName,
  setIngredientToken,
  setUse,
} from "./edit";

const ing = (id: string, name = id): IngredientForm => ({
  id,
  name,
  quantity: "",
  unit: "",
  note: "",
  token: { shape: "round", color: "#c9bfae" },
  tokenLocked: false,
});

describe("moveItem", () => {
  it("moves an item up and down", () => {
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("returns the same array when the move falls off an end", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 2)).toBe(list);
  });

  it("does not mutate", () => {
    const list = ["a", "b"];
    moveItem(list, 0, 1);
    expect(list).toEqual(["a", "b"]);
  });
});

describe("ingredient token autofill", () => {
  it("follows the name until the person picks a token", () => {
    let row = setIngredientName(ing("x", ""), "soy sauce");
    expect(row.token.shape).toBe("liquid");
    row = setIngredientToken(row, { shape: "cube", color: "#ffffff" });
    row = setIngredientName(row, "tomato");
    expect(row.token).toEqual({ shape: "cube", color: "#ffffff" });
    expect(row.name).toBe("tomato");
  });
});

describe("removeIngredient", () => {
  it("also removes its uses from every step", () => {
    const form: FormState = emptyForm();
    form.ingredients = [ing("a"), ing("b")];
    form.steps[0].uses = [{ ingredientId: "a" }, { ingredientId: "b" }];
    const next = removeIngredient(form, "a");
    expect(next.ingredients.map((i) => i.id)).toEqual(["b"]);
    expect(next.steps[0].uses).toEqual([{ ingredientId: "b" }]);
  });
});

describe("setUse", () => {
  const step = emptyForm().steps[0];

  it("adds, switches to 'used earlier' and removes a use", () => {
    let uses = setUse(step, "a", "new").uses;
    expect(uses).toEqual([{ ingredientId: "a" }]);
    uses = setUse({ ...step, uses }, "a", "earlier").uses;
    expect(uses).toEqual([{ ingredientId: "a", portion: 0 }]);
    uses = setUse({ ...step, uses }, "a", "new").uses;
    expect(uses).toEqual([{ ingredientId: "a" }]);
    uses = setUse({ ...step, uses }, "a", "off").uses;
    expect(uses).toEqual([]);
  });

  it("keeps a partial portion when it is unchanged", () => {
    const partial = { ...step, uses: [{ ingredientId: "a", portion: 0.5 }] };
    expect(setUse(partial, "a", "new").uses).toEqual([{ ingredientId: "a", portion: 0.5 }]);
  });
});

describe("ingredientsFromLines", () => {
  it("parses pasted lines into rows with guessed tokens and unique ids", () => {
    const rows = ingredientsFromLines("2 tbsp soy sauce\n\n1 clove garlic, minced\n2 tbsp soy sauce", ["soy-sauce"]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ quantity: "2", unit: "tbsp", name: "soy sauce" });
    expect(rows[0].token.shape).toBe("liquid");
    expect(rows[1]).toMatchObject({ name: "garlic", note: "minced" });
    expect(new Set([...rows.map((r) => r.id), "soy-sauce"]).size).toBe(4);
  });
});

describe("guessStep", () => {
  it("re-detects technique, heat and timer from the text", () => {
    const step = { ...emptyForm().steps[0], text: "Simmer the sauce over low heat for 10 minutes." };
    const guessed = guessStep(step);
    expect(guessed.technique).toBe("simmer");
    expect(guessed.heat).toBe("low");
    expect([guessed.timerOn, guessed.timerMinutes, guessed.timerSeconds]).toEqual([true, "10", "0"]);
  });

  it("leaves the timer alone when the text names no duration", () => {
    const step = { ...emptyForm().steps[0], text: "Chop the onion.", timerOn: true, timerMinutes: "3" };
    const guessed = guessStep(step);
    expect(guessed.technique).toBe("chop");
    expect(guessed.timerMinutes).toBe("3");
  });
});
