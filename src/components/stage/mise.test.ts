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

  it("never draws stock, juice, paste or a ground spice as the fresh food it is named after", () => {
    for (const name of ["chicken stock", "chicken broth", "beef broth", "lemon juice", "tomato paste", "garlic powder", "ginger powder", "potato starch", "red fermented bean curd"]) expect(miseFor(ing(name)), name).toBeNull();
  });

  it("leaves food mise can't draw yet to the old tokens", () => {
    for (const name of ["ground coriander", "peppermint extract", "white pepper", "black pepper", "chili flakes", "chili oil", "oyster sauce"]) expect(miseFor(ing(name)), name).toBeNull();
  });

  it("draws shrimp and prawns as mise curls, and halves them down the back", () => {
    expect(miseFor(ing("shrimp"))?.form).toBe("curl");
    expect(miseFor(ing("peeled shrimp"))?.props).toMatchObject({ peeled: true });
    expect(miseFor(ing("tiger prawns"))?.props).toMatchObject({ shape: "prawn" });
    expect(cutFor(ing("shrimp"), "slice", "Peel the shrimp, slice each one in half lengthwise, rinse.", miseFor(ing("shrimp")))).toBe("halved");
  });

  it("draws noodles and pasta as mise strands, flat, egg or round, and bean sprouts as sprouts", () => {
    const shape = (name: string) => (miseFor(ing(name))?.props as { shape?: string } | undefined)?.shape;
    expect(miseFor(ing("spaghetti"))?.form).toBe("strand");
    expect(shape("fresh flat rice noodles")).toBe("flat");
    expect(shape("egg noodles")).toBe("egg");
    expect(miseFor(ing("fettuccine"))?.props).toMatchObject({ shape: "flat", color: "#e8c77a" });
    expect(miseFor(ing("bean sprouts"))?.props).toMatchObject({ shape: "sprout" });
  });

  it("draws bell peppers and chilies as mise peppers, and mushrooms as mise caps", () => {
    expect(miseFor(ing("green bell pepper"))?.props).toMatchObject({ color: "#3f8a2a" });
    expect(miseFor(ing("red bell peppers"))?.form).toBe("pepper");
    expect(miseFor(ing("fresh red chilies"))?.props).toMatchObject({ shape: "chili" });
    expect(miseFor(ing("Thai chilies"))?.props).toMatchObject({ realSize: 5 });
    expect(miseFor(ing("dried shiitake mushrooms"))?.props).toMatchObject({ shape: "shiitake" });
    expect(miseFor(ing("oyster mushrooms"))?.props).toMatchObject({ shape: "oyster" });
    expect(miseFor(ing("button mushrooms"))?.form).toBe("cap");
  });

  it("draws eggs as mise eggs, but never eggplant", () => {
    expect(miseFor(ing("large eggs"))?.form).toBe("egg");
    expect(miseFor(ing("egg yolks"))?.form).toBe("egg");
    expect(miseFor(ing("eggplant"))?.form).not.toBe("egg");
  });

  it("draws herbs and greens as mise leaves", () => {
    const shape = (name: string) => (miseFor(ing(name))?.props as { shape?: string } | undefined)?.shape;
    expect(["cilantro", "flat-leaf parsley", "basil leaves", "fresh mint", "baby spinach", "bok choy", "napa cabbage", "red cabbage"].map(shape)).toEqual([
      "cilantro",
      "cilantro",
      "basil",
      "basil",
      "spinach",
      "bokchoy",
      "cabbage",
      "cabbage",
    ]);
    expect(miseFor(ing("red cabbage"))?.props).toMatchObject({ color: "#6b2d5c" });
  });

  it("draws broccoli and cauliflower as mise florets", () => {
    expect(miseFor(ing("broccoli"))?.form).toBe("floret");
    expect(miseFor(ing("cauliflower"))?.props).toMatchObject({ shape: "cauliflower" });
  });

  it("draws carrots, daikon and potatoes as mise roots", () => {
    expect(miseFor(ing("carrots"))?.form).toBe("root");
    expect(miseFor(ing("daikon"))?.props).toMatchObject({ shape: "daikon" });
    expect(miseFor(ing("sweet potato"))?.props).toMatchObject({ shape: "potato", flesh: "#f29a4a" });
    expect(miseFor(ing("frozen corn and peas"))).toBeNull();
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

  it("fits the biggest food in the room given, zooming in on small food", () => {
    const at = (name: string, cut: "whole" | "sliced" = "whole") => boardScale([{ match: miseFor(ing(name))!, cut }], 170);
    expect(at("garlic")).toBeGreaterThan(at("onion"));
    expect(at("onion")).toBeGreaterThan(at("scallion"));
    expect(at("garlic")).toBeLessThanOrEqual(15);
    const both = boardScale([{ match: miseFor(ing("onion"))!, cut: "diced" }, { match: miseFor(ing("scallion"))!, cut: "rings" }], 120);
    expect(miseSize(miseFor(ing("scallion"))!, "rings", both)).toBeLessThanOrEqual(120.01);
  });

  it("keeps real proportions between foods drawn at one scale", () => {
    const px = 8;
    expect(miseSize(miseFor(ing("onion"))!, "whole", px)).toBeGreaterThan(miseSize(miseFor(ing("garlic"))!, "whole", px));
  });
});
