import { describe, expect, it } from "vitest";
import { draftFromJsonLd, extractJsonLdRecipe } from "./jsonld";
import { validateDraft } from "./validate";

const recipe = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Garlic Tomato Pasta",
  description:
    "A quick weeknight pasta with sweet tomatoes and plenty of garlic. It comes together in twenty minutes. Serve it with crusty bread and a green salad for a full dinner that nobody will complain about at all.",
  recipeCuisine: "Italian",
  recipeYield: ["4", "4 servings"],
  prepTime: "PT10M",
  cookTime: "PT20M",
  author: { "@type": "Person", name: "Jane Cook" },
  recipeIngredient: [
    "200g spaghetti",
    "3-4 cloves garlic, minced",
    "1 (14 oz) can tomatoes",
    "2 tbsp olive oil",
    "salt to taste",
    "a handful of basil",
  ],
  recipeInstructions: [
    { "@type": "HowToStep", name: "Boil pasta", text: "Bring a large pot of salted water to a boil. Cook the spaghetti for 9-10 minutes until al dente, then drain." },
    {
      "@type": "HowToSection",
      name: "Sauce",
      itemListElement: [
        { "@type": "HowToStep", text: "Heat the olive oil in a pan over medium heat. Add the garlic and sauté until fragrant, about 1 minute." },
        { "@type": "HowToStep", text: "Add the tomatoes and simmer for 15 minutes. Chef's tip: crush them with a spoon." },
      ],
    },
    { "@type": "HowToStep", text: "Toss the pasta with the sauce. Tear in the basil and serve." },
  ],
};

describe("draftFromJsonLd", () => {
  const draft = draftFromJsonLd(recipe, "https://www.example.com/pasta");

  it("is a valid draft", () => {
    expect(validateDraft(draft)).toEqual([]);
  });

  it("maps the basic fields", () => {
    expect(draft.title).toBe("Garlic Tomato Pasta");
    expect(draft.cuisine).toBe("Italian");
    expect(draft.servings).toBe(4);
    expect(draft.prepMinutes).toBe(10);
    expect(draft.cookMinutes).toBe(20);
    expect(draft.source).toEqual({ name: "Jane Cook", url: "https://www.example.com/pasta" });
  });

  it("cuts the description at a sentence end within 200 characters", () => {
    expect(draft.description.length).toBeLessThanOrEqual(200);
    expect(draft.description.endsWith("minutes.")).toBe(true);
  });

  it("parses ingredients with tokens", () => {
    expect(draft.ingredients.map((i) => i.id)).toEqual(["spaghetti", "garlic", "tomatoes", "olive-oil", "salt", "basil"]);
    expect(draft.ingredients[1]).toMatchObject({ quantity: 3.5, unit: "clove", note: "minced", token: { shape: "wedge" } });
  });

  it("flattens sections and structures steps", () => {
    const techniques = draft.steps.map((s) => s.technique);
    expect(techniques).toContain("boil");
    expect(techniques).toContain("saute");
    expect(techniques).toContain("simmer");
    expect(techniques.at(-1)).toBe("plate");
    expect(draft.steps.every((s) => s.text.length <= 160)).toBe(true);
    expect(draft.steps.some((s) => s.text.toLowerCase().includes("crush them"))).toBe(false);
  });

  it("links each ingredient once at full amount", () => {
    const uses = draft.steps.flatMap((s) => s.uses).filter((u) => u.ingredientId === "spaghetti");
    expect(uses[0].portion).toBeUndefined();
    expect(uses.slice(1).every((u) => u.portion === 0)).toBe(true);
  });

  it("warns about an ingredient that no step mentions", () => {
    expect(draft.warnings.some((w) => w.includes("salt"))).toBe(true);
  });

  it("falls back for missing fields", () => {
    const d = draftFromJsonLd({ "@type": "Recipe", name: "Toast", recipeIngredient: ["2 slices bread"], recipeInstructions: "Toast the bread." });
    expect(d.cuisine).toBe("Other");
    expect(d.servings).toBe(2);
    expect(d.source).toBeUndefined();
    expect(validateDraft(d)).toEqual([]);
  });

  it("uses publisher or hostname for the source", () => {
    const withPublisher = draftFromJsonLd({ ...recipe, publisher: { name: "Pasta Weekly" } }, "https://x.test/r");
    expect(withPublisher.source?.name).toBe("Pasta Weekly");
    const host = draftFromJsonLd({ ...recipe, author: undefined }, "https://www.example.com/r");
    expect(host.source?.name).toBe("example.com");
  });

  it("falls back from prep/cook to total time, then to timers", () => {
    const base = { ...recipe, prepTime: undefined, cookTime: undefined };
    expect(draftFromJsonLd({ ...base, totalTime: "PT45M" }).cookMinutes).toBe(45);
    const sum = draftFromJsonLd(base);
    expect(sum.cookMinutes).toBeGreaterThan(20);
  });

  it("derives difficulty from size", () => {
    expect(draft.difficulty).toBe("easy");
    const many = draftFromJsonLd({
      ...recipe,
      recipeIngredient: Array.from({ length: 19 }, (_, i) => `${i + 1} cup thing${i}`),
    });
    expect(many.difficulty).toBe("hard");
    const steps = Array.from({ length: 14 }, (_, i) => `Boil item ${i} for 2 minutes.`);
    expect(draftFromJsonLd({ ...recipe, recipeInstructions: steps }).difficulty).toBe("hard");
    const mid = Array.from({ length: 10 }, (_, i) => `Boil item ${i} for 2 minutes.`);
    expect(draftFromJsonLd({ ...recipe, recipeInstructions: mid }).difficulty).toBe("medium");
  });

  it("gives unique ids to duplicate ingredient names", () => {
    const d = draftFromJsonLd({ ...recipe, recipeIngredient: ["1 tbsp soy sauce", "2 tbsp soy sauce", "1 tsp soy sauce"] });
    expect(d.ingredients.map((i) => i.id)).toEqual(["soy-sauce", "soy-sauce-2", "soy-sauce-3"]);
  });

  it("keeps repeated ingredient lines apart with a note saying which step they belong to", () => {
    const d = draftFromJsonLd({
      ...recipe,
      recipeIngredient: ["1 tbsp soy sauce", "2 tbsp water", "2 tbsp soy sauce, light", "1 cup water"],
      recipeInstructions: [
        "Stir the first soy sauce and the first water together in a bowl.",
        "Bring a pot to a boil, then add the second soy sauce and water.",
      ],
    });
    const notes = Object.fromEntries(d.ingredients.map((i) => [i.id, i.note]));
    expect(notes["soy-sauce"]).toBe("for step 1");
    expect(notes["water"]).toBe("for step 1");
    expect(notes["soy-sauce-2"]).toBe("light, for step 2");
    expect(notes["water-2"]).toBe("for step 2");
    expect(validateDraft(d)).toEqual([]);
  });

  it("leaves ingredient notes alone when names are not repeated", () => {
    const d = draftFromJsonLd({ ...recipe, recipeIngredient: ["2 tbsp soy sauce, light", "1 tsp sugar"] });
    expect(d.ingredients.map((i) => i.note)).toEqual(["light", undefined]);
  });

  it("never throws on garbage", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { "@type": "Recipe" }]) {
      const d = draftFromJsonLd(bad);
      expect(validateDraft(d)).toEqual([]);
      expect(d.warnings.length).toBeGreaterThan(0);
    }
  });

  it("ignores zero-width characters", () => {
    const d = draftFromJsonLd({ ...recipe, recipeIngredient: ["2 tbsp soy sauce\u200b"] });
    expect(d.ingredients[0].name).toBe("soy sauce");
  });

  it("decodes entities and strips tags", () => {
    const d = draftFromJsonLd({
      ...recipe,
      name: "Mac &amp; Cheese",
      recipeInstructions: [{ "@type": "HowToStep", text: "<p>Boil the macaroni.</p><p>Drain &amp; serve.</p>" }],
    });
    expect(d.title).toBe("Mac & Cheese");
    expect(d.steps.map((s) => s.text).join(" ")).toContain("Drain & serve");
  });
});

describe("extractJsonLdRecipe", () => {
  const page = (...blocks: string[]) =>
    `<html><head><title>x</title>${blocks.map((b) => `<script type="application/ld+json">${b}</script>`).join("")}</head><body></body></html>`;

  it("finds a plain Recipe", () => {
    expect((extractJsonLdRecipe(page(JSON.stringify(recipe))) as { name: string }).name).toBe("Garlic Tomato Pasta");
  });

  it("finds a Recipe inside @graph", () => {
    const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }, { "@type": ["Recipe", "Thing"], name: "In graph" }] };
    expect((extractJsonLdRecipe(page(JSON.stringify(graph))) as { name: string }).name).toBe("In graph");
  });

  it("finds a Recipe inside an array and after other blocks", () => {
    const html = page(JSON.stringify({ "@type": "Organization" }), JSON.stringify([{ "@type": "Article" }, { "@type": "Recipe", name: "In array" }]));
    expect((extractJsonLdRecipe(html) as { name: string }).name).toBe("In array");
  });

  it("tolerates broken blocks and odd attribute quoting", () => {
    const html = `<script type='application/ld+json' data-x="1">{ not json</script><script type=application/ld+json>${JSON.stringify({ "@type": "Recipe", name: "ok" })}</script>`;
    expect((extractJsonLdRecipe(html) as { name: string }).name).toBe("ok");
  });

  it("returns null when there is no recipe", () => {
    expect(extractJsonLdRecipe("<html></html>")).toBeNull();
    expect(extractJsonLdRecipe(page(JSON.stringify({ "@type": "WebSite" })))).toBeNull();
  });
});
