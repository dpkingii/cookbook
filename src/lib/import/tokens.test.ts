import { describe, expect, it } from "vitest";
import { guessToken } from "./tokens";

describe("guessToken", () => {
  const shapes: [string, string][] = [
    ["garlic", "wedge"],
    ["3 cloves garlic", "wedge"],
    ["ginger", "wedge"],
    ["lemon", "wedge"],
    ["roma tomatoes", "round"],
    ["cherry tomato", "round"],
    ["egg", "round"],
    ["large eggs", "round"],
    ["potatoes", "round"],
    ["shiitake mushrooms", "round"],
    ["basil", "leaf"],
    ["fresh cilantro", "leaf"],
    ["baby spinach", "leaf"],
    ["bok choy", "leaf"],
    ["parsley", "leaf"],
    ["spaghetti", "strand"],
    ["fresh flat rice noodles", "strand"],
    ["bean sprouts", "strand"],
    ["egg noodles", "strand"],
    ["olive oil", "liquid"],
    ["Kikkoman Soy Sauce", "liquid"],
    ["oyster sauce", "liquid"],
    ["chicken broth", "liquid"],
    ["water", "liquid"],
    ["Shaoxing wine", "liquid"],
    ["rice vinegar", "liquid"],
    ["honey", "liquid"],
    ["milk", "liquid"],
    ["tomato paste", "liquid"],
    ["salt", "grain"],
    ["garlic salt", "grain"],
    ["white pepper", "grain"],
    ["sugar", "grain"],
    ["brown sugar", "grain"],
    ["all-purpose flour", "grain"],
    ["cornstarch", "grain"],
    ["five spice powder", "grain"],
    ["baking soda", "grain"],
    ["jasmine rice", "grain"],
    ["rolled oats", "grain"],
    ["chicken bouillon powder", "grain"],
    ["chicken thighs", "cube"],
    ["flank steak", "cube"],
    ["pork shoulder", "cube"],
    ["salmon", "cube"],
    ["soft tofu", "cube"],
    ["cheddar cheese", "cube"],
    ["butter", "cube"],
    ["yellow onion", "bulb"],
    ["red onion", "bulb"],
    ["shallot", "bulb"],
    ["carrot", "long"],
    ["scallions", "long"],
    ["green onion", "long"],
    ["celery", "long"],
    ["cucumber", "long"],
    ["red chili", "long"],
    ["broccoli", "bulb"],
    ["shrimp", "wedge"],
    ["dried cloud ear fungus", "round"],
    ["rehydrated wood ear fungus", "round"],
    ["red food coloring", "liquid"],
    ["doubanjiang", "liquid"],
    ["maltose", "liquid"],
    ["abalone", "cube"],
    ["dried beancurd sheet", "cube"],
    ["bamboo leaves", "leaf"],
    ["lotus leaves", "leaf"],
    ["dried seaweed", "leaf"],
    ["ong choy", "leaf"],
    ["jicama", "bulb"],
    ["dried lily bulb", "bulb"],
    ["dried jujube", "round"],
    ["goji berry", "round"],
    ["lotus seed", "round"],
    ["siu mai wrappers", "round"],
    ["potsticker wrappers", "round"],
    ["desiccated coconut", "grain"],
    ["beansprout", "strand"],
    ["fresh chow fun", "strand"],
    ["yee mein", "strand"],
    ["coconut milk", "liquid"],
  ];
  it.each(shapes)("%s -> %s", (name, shape) => {
    expect(guessToken(name).shape).toBe(shape);
  });

  it("returns a hex colour", () => {
    for (const [name] of shapes) expect(guessToken(name).color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("gives tomato a red colour and basil a green one", () => {
    const t = guessToken("tomato").color;
    const b = guessToken("basil").color;
    expect(parseInt(t.slice(1, 3), 16)).toBeGreaterThan(parseInt(t.slice(3, 5), 16));
    expect(parseInt(b.slice(3, 5), 16)).toBeGreaterThan(parseInt(b.slice(1, 3), 16));
  });

  it("falls back to something neutral", () => {
    const t = guessToken("zzzzzz");
    expect(t.shape).toBe("round");
    expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
