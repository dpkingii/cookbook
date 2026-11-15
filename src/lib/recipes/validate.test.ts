import { describe, expect, it } from "vitest";
import { emptyForm } from "./form";
import { validateForm } from "./validate";

function valid() {
  const form = emptyForm();
  form.title = "Toast";
  form.steps[0].text = "Toast the bread.";
  return form;
}

describe("validateForm", () => {
  it("accepts a minimal recipe", () => {
    expect(validateForm(valid())).toEqual([]);
  });

  it("names the field and step in each message", () => {
    const form = valid();
    form.title = " ";
    form.steps.push({ ...form.steps[0], key: "k2", text: "" });
    form.steps.push({ ...form.steps[0], key: "k3", text: "Serve." });
    expect(validateForm(form)).toEqual([
      { field: "title", message: "Give the recipe a title" },
      { field: "step-1-text", message: "Step 2 has no text" },
    ]);
  });

  it("asks for at least one step", () => {
    const form = valid();
    form.steps = [];
    expect(validateForm(form)).toEqual([{ field: "add-step", message: "Add at least one step" }]);
  });

  it("checks numbers", () => {
    const form = valid();
    form.servings = "0";
    form.prepMinutes = "-5";
    form.cookMinutes = "1.5";
    expect(validateForm(form).map((i) => i.field)).toEqual(["servings", "prepMinutes", "cookMinutes"]);
  });

  it("flags a named ingredient problem but ignores a fully blank row", () => {
    const form = valid();
    form.ingredients = [
      { ...form.ingredients[0], name: "", quantity: "", unit: "", note: "" },
      { ...form.ingredients[0], id: "b", name: "", quantity: "2" },
      { ...form.ingredients[0], id: "c", name: "salt", quantity: "lots" },
    ];
    expect(validateForm(form)).toEqual([
      { field: "ingredient-1-name", message: "Ingredient 2 needs a name" },
      { field: "ingredient-2-quantity", message: "Ingredient 3: use a number such as 2, 1/2 or 1.5" },
    ]);
  });

  it("rejects an empty timer", () => {
    const form = valid();
    Object.assign(form.steps[0], { timerOn: true, timerMinutes: "0", timerSeconds: "0" });
    expect(validateForm(form)).toEqual([{ field: "step-0-timer-minutes", message: "Step 1: set the timer to at least 1 second, or turn it off" }]);
  });
});
