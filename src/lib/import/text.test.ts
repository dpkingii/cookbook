import { describe, expect, it } from "vitest";
import { draftFromText } from "./text";
import { validateDraft } from "./validate";

const withHeadings = `Lemon Garlic Chicken

A bright, simple dinner.

Serves 4
Prep time: 15 minutes
Cook time: 25 minutes

Ingredients
- 4 chicken thighs
- 3 cloves garlic, minced
- 2 tbsp olive oil
- 1 lemon, juiced
- salt and pepper to taste

Instructions
1. Season the chicken with salt and pepper.
2. Heat the olive oil in a skillet over medium-high heat and sear the chicken for 5 minutes per side until golden brown.
3. Add the garlic and lemon juice and simmer for 10 minutes.
4. Serve hot.
`;

describe("draftFromText with headings", () => {
  const draft = draftFromText(withHeadings);

  it("is valid", () => {
    expect(validateDraft(draft)).toEqual([]);
  });

  it("reads the title, description and metadata", () => {
    expect(draft.title).toBe("Lemon Garlic Chicken");
    expect(draft.description).toBe("A bright, simple dinner.");
    expect(draft.servings).toBe(4);
    expect(draft.prepMinutes).toBe(15);
    expect(draft.cookMinutes).toBe(25);
  });

  it("reads bulleted ingredients", () => {
    expect(draft.ingredients.map((i) => i.name)).toEqual(["chicken thighs", "garlic", "olive oil", "lemon", "salt and pepper"]);
    expect(draft.ingredients[1]).toMatchObject({ quantity: 3, unit: "clove", note: "minced" });
  });

  it("reads numbered steps and strips the numbers", () => {
    expect(draft.steps[0].text.startsWith("Season the chicken")).toBe(true);
    expect(draft.steps.map((s) => s.technique)).toContain("sear");
    expect(draft.steps.at(-1)?.technique).toBe("plate");
    expect(draft.steps.some((s) => s.timer?.seconds === 300)).toBe(true);
  });
});

describe("draftFromText heading variants", () => {
  const body = "Soup\nINGREDIENTS:\n2 cups water\n1 tsp salt\nMETHOD\nBoil the water.\nAdd the salt.";
  it("accepts upper case headings with or without a colon", () => {
    const d = draftFromText(body);
    expect(d.title).toBe("Soup");
    expect(d.ingredients).toHaveLength(2);
    expect(d.steps.length).toBeGreaterThanOrEqual(2);
  });

  it.each(["Directions", "Steps", "method:", "## Instructions", "Preparation"])("recognises %s", (heading) => {
    const d = draftFromText(`Toast\nIngredients\n2 slices bread\n${heading}\nToast the bread until golden.`);
    expect(d.ingredients).toHaveLength(1);
    expect(d.steps[0].text).toContain("Toast the bread");
  });

  it("turns sub-headings inside ingredients into notes", () => {
    const d = draftFromText("Stir fry\nIngredients\nFor the sauce:\n2 tbsp soy sauce\n1 tsp sugar\nFor the veg:\n1 carrot\nInstructions\nStir-fry the carrot.");
    expect(d.ingredients.map((i) => i.note)).toEqual(["for the sauce", "for the sauce", "for the veg"]);
  });

  it("joins wrapped lines inside numbered steps", () => {
    const d = draftFromText("Eggs\nIngredients\n2 eggs\nInstructions\n1. Crack the eggs into a bowl\nand whisk well.\n2. Fry in a pan.");
    expect(d.steps).toHaveLength(2);
    expect(d.steps[0].text).toContain("Crack the eggs into a bowl and whisk well");
  });
});

describe("draftFromText without headings", () => {
  const raw = `Quick Pasta
200g spaghetti
2 cloves garlic
2 tbsp olive oil
Boil the spaghetti for 10 minutes and drain.
Sauté the garlic in the olive oil until fragrant.
Toss everything together and serve.`;

  it("separates ingredient-looking lines from steps", () => {
    const d = draftFromText(raw);
    expect(validateDraft(d)).toEqual([]);
    expect(d.title).toBe("Quick Pasta");
    expect(d.ingredients.map((i) => i.id)).toEqual(["spaghetti", "garlic", "olive-oil"]);
    expect(d.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("does not mistake a step that starts with a number for an ingredient", () => {
    const d = draftFromText("Tea\n1 cup water\n10 minutes later, pour the water over the tea leaves and serve.");
    expect(d.ingredients).toHaveLength(1);
    expect(d.steps).toHaveLength(1);
  });
});

describe("draftFromText robustness", () => {
  it.each(["", "   \n\n ", "just one line", "Ingredients\nInstructions", "1.\n2.\n3.", "\u0000\u0001 ???", "x".repeat(5000)])(
    "never throws: %j",
    (input) => {
      const d = draftFromText(input);
      expect(validateDraft(d)).toEqual([]);
      expect(d.warnings.length).toBeGreaterThan(0);
    },
  );

  it("warns when the title is missing", () => {
    const d = draftFromText("2 cups flour\nMix the flour.");
    expect(d.warnings.some((w) => /title/i.test(w))).toBe(true);
  });
});
