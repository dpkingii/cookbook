import { describe, expect, it } from "vitest";
import type { Ingredient } from "@/lib/recipe/types";
import { boardScale, cutFor, miseFor, miseSize } from "./mise";

const ing = (name: string): Ingredient => ({ id: name, name, quantity: 1, unit: null, token: { shape: "long", color: "#888888" } });

describe("mise on the board", () => {
  it("matches the most specific name first", () => {
    expect(miseFor(ing("green onion"))?.form).toBe("stalk");
    expect(miseFor(ing("red onion"))?.props).toMatchObject({ shape: "squat" });
    expect(miseFor(ing("yellow onion"))?.form).toBe("bulb");
    expect(miseFor(ing("garlic cloves"))?.props).toMatchObject({ part: "clove" });
    expect(miseFor(ing("boneless chicken thighs"))?.form).toBe("slab");
    expect(miseFor(ing("cherry tomatoes"))?.props).toMatchObject({ realSize: 2.5 });
  });

  it("leaves food mise can't draw yet to the old tokens", () => {
    for (const name of ["carrot", "broccoli", "cilantro", "shrimp"]) expect(miseFor(ing(name))).toBeNull();
  });

  it("takes the cut from the sentence that names the ingredient, last cut winning", () => {
    const text = "Dice the green parts of the onion. Cut the carrot into strips, then small dice.";
    expect(cutFor(ing("green onion"), "chop", text, miseFor(ing("green onion")))).toBe("diced");
    expect(cutFor(ing("carrot"), "chop", text, null)).toBe("diced");
    expect(cutFor(ing("fresh ginger"), "slice", "Cut the ginger into thin strips.", null)).toBe("strips");
    expect(cutFor(ing("yellow onion"), "chop", "Finely chop the onion.", null)).toBe("minced");
  });

  it("falls back to the technique, and chops a scallion into rings", () => {
    expect(cutFor(ing("garlic"), "mince", "Prepare the garlic.", null)).toBe("minced");
    expect(cutFor(ing("scallions"), "chop", "Prepare the scallions.", miseFor(ing("scallions")))).toBe("rings");
  });

  it("moves the camera in on small food and out on long food, within limits", () => {
    const clove = boardScale(miseFor(ing("garlic")));
    const onion = boardScale(miseFor(ing("onion")));
    const scallion = boardScale(miseFor(ing("scallion")));
    expect(clove).toBeGreaterThan(onion);
    expect(onion).toBeGreaterThan(scallion);
    expect(scallion).toBeGreaterThanOrEqual(4.6);
    expect(clove).toBeLessThanOrEqual(15);
  });

  it("keeps real proportions between foods drawn at one scale", () => {
    const px = 8;
    expect(miseSize(miseFor(ing("onion"))!, "whole", px)).toBeGreaterThan(miseSize(miseFor(ing("garlic"))!, "whole", px));
  });
});
