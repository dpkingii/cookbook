import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "./ingredient";

describe("parseIngredientLine", () => {
  const cases: [string, { quantity: number | null; unit: string | null; name: string; note?: string }][] = [
    ["2 tbsp olive oil", { quantity: 2, unit: "tbsp", name: "olive oil" }],
    ["1 1/2 cups flour, sifted", { quantity: 1.5, unit: "cup", name: "flour", note: "sifted" }],
    ["½ onion", { quantity: 0.5, unit: null, name: "onion" }],
    ["1½ cups milk", { quantity: 1.5, unit: "cup", name: "milk" }],
    ["3-4 cloves garlic, minced", { quantity: 3.5, unit: "clove", name: "garlic", note: "minced" }],
    ["2 to 3 tablespoons butter", { quantity: 2.5, unit: "tbsp", name: "butter" }],
    ["0.5 tsp salt", { quantity: 0.5, unit: "tsp", name: "salt" }],
    ["salt to taste", { quantity: null, unit: null, name: "salt", note: "to taste" }],
    ["1 (14 oz) can tomatoes", { quantity: 1, unit: "can", name: "tomatoes", note: "14 oz" }],
    ["200g spaghetti", { quantity: 200, unit: "g", name: "spaghetti" }],
    ["a handful of basil", { quantity: 1, unit: "handful", name: "basil" }],
    ["1 tbsp Kikkoman® Oyster Sauce", { quantity: 1, unit: "tbsp", name: "oyster sauce" }],
    ["2 Tablespoons Sriracha™", { quantity: 2, unit: "tbsp", name: "Sriracha" }],
    ["1 tsp Acme® soy sauce", { quantity: 1, unit: "tsp", name: "soy sauce" }],
    ["2 tbsp Big Fork Foods™ Tamari Soy Sauce", { quantity: 2, unit: "tbsp", name: "tamari soy sauce" }],
    ["1 cup Acme® (low sodium) chicken broth", { quantity: 1, unit: "cup", name: "chicken broth", note: "low sodium" }],
    ["3 tbsp Sriracha™, to taste", { quantity: 3, unit: "tbsp", name: "Sriracha", note: "to taste" }],
    ["1 lb. ground beef", { quantity: 1, unit: "lb", name: "ground beef" }],
    ["500 grams chicken thighs", { quantity: 500, unit: "g", name: "chicken thighs" }],
    ["1.5 kg potatoes", { quantity: 1.5, unit: "kg", name: "potatoes" }],
    ["250 ml milk", { quantity: 250, unit: "ml", name: "milk" }],
    ["2 liters water", { quantity: 2, unit: "l", name: "water" }],
    ["8 ounces cream cheese", { quantity: 8, unit: "oz", name: "cream cheese" }],
    ["2 pounds pork shoulder", { quantity: 2, unit: "lb", name: "pork shoulder" }],
    ["2 stalks celery", { quantity: 2, unit: "stalk", name: "celery" }],
    ["3 stems scallions", { quantity: 3, unit: "stem", name: "scallions" }],
    ["4 large eggs", { quantity: 4, unit: null, name: "large eggs" }],
    ["1 cup of rice", { quantity: 1, unit: "cup", name: "rice" }],
    ["1 rice cup white rice", { quantity: 1, unit: "rice cup", name: "white rice" }],
    ["1 pinch of salt", { quantity: 1, unit: "pinch", name: "salt" }],
    ["2 tbsp soy sauce, for the marinade", { quantity: 2, unit: "tbsp", name: "soy sauce", note: "for the marinade" }],
    ["1 tsp sugar for the sauce", { quantity: 1, unit: "tsp", name: "sugar", note: "for the sauce" }],
    ["1 onion (diced)", { quantity: 1, unit: null, name: "onion", note: "diced" }],
    ["Salt and pepper", { quantity: null, unit: null, name: "Salt and pepper" }],
    ["a few sprigs thyme", { quantity: null, unit: "sprig", name: "thyme" }],
    ["  1/4   teaspoon   white pepper  ", { quantity: 0.25, unit: "tsp", name: "white pepper" }],
    ["1 1/2-2 cups stock", { quantity: 1.75, unit: "cup", name: "stock" }],
    ["2–3 slices bread", { quantity: 2.5, unit: "slice", name: "bread" }],
  ];

  it.each(cases)("%s", (line, expected) => {
    const got = parseIngredientLine(line);
    expect(got.quantity).toBe(expected.quantity);
    expect(got.unit).toBe(expected.unit);
    expect(got.name).toBe(expected.name);
    expect(got.note).toBe(expected.note);
  });

  it("never throws on junk", () => {
    expect(parseIngredientLine("").name).toBe("");
    expect(parseIngredientLine("   ").quantity).toBeNull();
  });
});
