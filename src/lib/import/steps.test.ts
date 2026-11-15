import { describe, expect, it } from "vitest";
import type { Ingredient } from "@/lib/recipe/types";
import { attachUnusedIngredients, createStepContext, detectCue, splitSentences, structureStep } from "./steps";

const ing = (id: string, name: string, note?: string, shape: Ingredient["token"]["shape"] = "round"): Ingredient => ({
  id,
  name,
  quantity: 1,
  unit: null,
  token: { shape, color: "#cccccc" },
  ...(note && { note }),
});

describe("splitSentences", () => {
  it("splits on sentence ends but not on abbreviations or decimals", () => {
    expect(splitSentences("Add 1.5 tsp salt. Stir well! Cook 2 oz. of rice? Done.")).toEqual([
      "Add 1.5 tsp salt.",
      "Stir well!",
      "Cook 2 oz. of rice?",
      "Done.",
    ]);
  });
});

describe("detectCue", () => {
  const cases: [string, string | undefined][] = [
    ["Fry until golden brown.", "Golden brown"],
    ["Bake for 10 minutes or until fragrant.", "Fragrant"],
    ["Broil until the cheese melts, then serve.", "The cheese melts"],
    ["Heat the oil until it's shimmering (or rippling).", "It's shimmering"],
    ["Chop the onion.", undefined],
  ];
  it.each(cases)("%s", (text, cue) => {
    expect(detectCue(text)).toBe(cue);
  });
});

describe("structureStep", () => {
  const ingredients = [ing("onion", "yellow onion"), ing("garlic", "garlic"), ing("oil", "olive oil")];

  it("returns one short step with technique, cue and uses", () => {
    const ctx = createStepContext();
    const [step, ...rest] = structureStep("Sauté the onion in olive oil until golden brown.", ingredients, ctx);
    expect(rest).toEqual([]);
    expect(step.technique).toBe("saute");
    expect(step.cue).toBe("Golden brown");
    expect(step.uses.map((u) => u.ingredientId)).toEqual(["onion", "oil"]);
    expect(step.text).toBe("Sauté the onion in olive oil until golden brown.");
  });

  it("gives later mentions a portion of 0", () => {
    const ctx = createStepContext();
    structureStep("Chop the onion.", ingredients, ctx);
    const [second] = structureStep("Add the onion back to the pan and stir-fry.", ingredients, ctx);
    expect(second.uses).toEqual([{ ingredientId: "onion", portion: 0 }]);
  });

  it("matches plurals and head nouns", () => {
    const ctx = createStepContext();
    const [s] = structureStep("Mince the onions.", ingredients, ctx);
    expect(s.uses.map((u) => u.ingredientId)).toEqual(["onion"]);
  });

  it("prefers the longer ingredient name when two share a head noun", () => {
    const list = [ing("soy", "soy sauce"), ing("oyster", "oyster sauce")];
    const [s] = structureStep("Stir in the oyster sauce.", list, createStepContext());
    expect(s.uses.map((u) => u.ingredientId)).toEqual(["oyster"]);
  });

  describe("named ingredient groups", () => {
    const list = [
      ing("beef", "beef", undefined, "cube"),
      ing("soy", "soy sauce"),
      ing("sugar", "sugar"),
      ing("vinegar", "rice vinegar"),
      ing("ginger", "ginger"),
      ing("pepper", "white pepper"),
    ];

    it("links every ingredient of a bowl that was just mixed when a later step says 'the sauce'", () => {
      const ctx = createStepContext();
      structureStep("Whisk together the soy sauce, sugar and rice vinegar in a small bowl.", list, ctx);
      const [pour] = structureStep("Pour the sauce into the hot pan and stir.", list, ctx);
      expect(pour.uses).toEqual([
        { ingredientId: "soy", portion: 0 },
        { ingredientId: "sugar", portion: 0 },
        { ingredientId: "vinegar", portion: 0 },
      ]);
    });

    it("works for the marinade and ignores the protein that was marinated", () => {
      const ctx = createStepContext();
      structureStep("Mix the beef with the soy sauce, sugar and white pepper, and marinate.", list, ctx);
      const [again] = structureStep("Drain off the marinade and sear the beef.", list, ctx);
      expect(again.uses.map((u) => u.ingredientId).sort()).toEqual(["beef", "pepper", "soy", "sugar"]);
    });

    it("uses ingredient notes naming the group when no bowl was mixed", () => {
      const noted = [ing("s", "soy sauce", "for the sauce"), ing("g", "ginger", "for the sauce"), ing("b", "beef")];
      const [step] = structureStep("Stir the sauce into the beef.", noted, createStepContext());
      expect(step.uses.map((u) => u.ingredientId).sort()).toEqual(["b", "g", "s"]);
    });

    it("does not treat a specific sauce name as a group", () => {
      const ctx = createStepContext();
      structureStep("Whisk together the soy sauce, sugar and rice vinegar in a small bowl.", list, ctx);
      const [step] = structureStep("Stir in the white pepper.", list, ctx);
      expect(step.uses.map((u) => u.ingredientId)).toEqual(["pepper"]);
    });
  });

  it("types a prep step by the timed action when the timer belongs to a soak", () => {
    const list = [ing("m", "dried mushrooms")];
    const [step] = structureStep("Soak the dried mushrooms in warm water for 20 minutes. Slice them thinly.", list, createStepContext());
    expect(step.technique).toBe("drain");
    expect(step.timer?.seconds).toBe(1200);
    expect(step.timer?.label).toMatch(/soak/i);
  });

  it("leaves out asides that are not actions", () => {
    const list = [ing("onion", "yellow onion")];
    const steps = structureStep(
      "Sauté the onion until soft. Take a moment to enjoy the smell. Be careful, the pan is hot. Do this thoroughly. Feel free to add more.",
      list,
      createStepContext(),
    );
    expect(steps).toHaveLength(1);
    expect(steps[0].text).toBe("Sauté the onion until soft.");
  });

  it("consumes duplicate ingredient lines one mention at a time", () => {
    const list = [ing("w1", "water"), ing("w2", "water")];
    const ctx = createStepContext();
    const [a] = structureStep("Bring the water to a boil.", list, ctx);
    const [b] = structureStep("Add the water to the slurry and mix.", list, ctx);
    expect(a.uses).toEqual([{ ingredientId: "w1" }]);
    expect(b.uses).toEqual([{ ingredientId: "w2" }]);
  });

  it("splits a long instruction into steps with their own techniques and timers", () => {
    const text =
      "Heat the oil in a pan and sauté the garlic until fragrant. Add the tomatoes and simmer for 20 minutes. Season with salt and serve over pasta.";
    const steps = structureStep(text, ingredients, createStepContext());
    expect(steps.map((s) => s.technique)).toEqual(["saute", "simmer", "plate"]);
    expect(steps[1].timer).toEqual({ seconds: 1200, mode: "background", label: expect.any(String) });
    for (const s of steps) expect(s.text.length).toBeLessThanOrEqual(160);
  });

  it("drops tips and explanations", () => {
    const text =
      "Whisk the eggs until smooth.\n\nChef's Tip: Use room-temperature eggs for the best volume.\n\nThis helps the eggs blend evenly. My dad always does it this way.";
    const steps = structureStep(text, ingredients, createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].text).toBe("Whisk the eggs until smooth.");
  });

  it("drops short heading lines that precede a paragraph", () => {
    const steps = structureStep("Add slurry\n\nPour the slurry slowly into the pot while stirring.", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].text).toBe("Pour the slurry slowly into the pot while stirring.");
  });

  it("keeps a lone short step", () => {
    const steps = structureStep("Plate and enjoy", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].technique).toBe("plate");
  });

  it("reads leading heat labels and trailing time markers", () => {
    const text = "High heat — On high heat, add and stir-fry the mixed vegetables. — ~2-3 minutes";
    const [s] = structureStep(text, [], createStepContext());
    expect(s.technique).toBe("fry");
    expect(s.heat).toBe("high");
    expect(s.timer?.seconds).toBe(150);
    expect(s.text).toBe("On high heat, add and stir-fry the mixed vegetables.");
  });

  it("does not attach heat to prep techniques", () => {
    const [s] = structureStep("Chop the onion before the pan is on medium heat.", [], createStepContext());
    expect(s.technique).toBe("chop");
    expect(s.heat).toBeUndefined();
  });

  it("shortens one very long sentence to 160 characters", () => {
    const long =
      "Slice the onion into thin half moons, then cut the carrot into matchsticks, and finally shred the cabbage into long thin ribbons so that every vegetable cooks at the same speed in the pan later on.";
    const [s] = structureStep(long, [], createStepContext());
    expect(s.text.length).toBeLessThanOrEqual(160);
    expect(s.text.startsWith("Slice the onion")).toBe(true);
  });

  it("falls back to rest and names the step in a warning", () => {
    const ctx = createStepContext();
    structureStep("Chop the onion.", [], ctx);
    const [s] = structureStep("Wait patiently for the magic to happen.", [], ctx);
    expect(s.technique).toBe("rest");
    expect(ctx.warnings.some((w) => w.includes("Step 2") && w.includes("Wait patiently"))).toBe(true);
  });

  it("uses the step name when the text has nothing usable", () => {
    const [s] = structureStep("It is lovely.", [], createStepContext(), "Prepare the shrimp");
    expect(s.text).toBe("Prepare the shrimp.");
    expect(s.technique).toBe("rest");
  });

  it("uses the name to find a technique the text does not state", () => {
    const [s] = structureStep("Use a sharp knife.", [], createStepContext(), "Slice the beef");
    expect(s.technique).toBe("slice");
  });
});

describe("structureStep grouping", () => {
  it("collapses a run of prep sentences into one step before the next real action", () => {
    const text =
      "Peel the shrimp. To easily remove the shell, twist off the tail. Slice through it sideways. Rinse and drain the shrimp. Chop into 1/2-inch pieces. Combine the chopped pieces with white pepper and cornstarch, then set aside.";
    const steps = structureStep(text, [], createStepContext());
    expect(steps.map((s) => s.technique)).toEqual(["slice", "whisk"]);
    for (const s of steps) expect(s.text.length).toBeLessThanOrEqual(160);
  });

  it("attaches sentences with no technique to the next action", () => {
    const steps = structureStep("Turn the heat to low. Combine the soy sauce and sugar.", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].technique).toBe("whisk");
  });

  it("attaches trailing housekeeping to the previous action", () => {
    const steps = structureStep("Fry the egg for 1 minute. Turn off the heat.", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].technique).toBe("fry");
  });

  it("drops optional 'if you' sentences when there is something else", () => {
    const steps = structureStep(
      "Simmer for 10 minutes. If you don't have a lid, you'll need to cook for another 20 minutes.",
      [],
      createStepContext(),
    );
    expect(steps).toHaveLength(1);
    expect(steps[0].timer?.seconds).toBe(600);
  });

  it("links ingredients from sentences it does not display", () => {
    const list = [ing("o", "onion"), ing("g", "garlic"), ing("j", "ginger"), ing("c", "chili")];
    const steps = structureStep(
      "Stir-fry the onion for 2 minutes until golden. Add the garlic. Add the ginger. Add the chili.",
      list,
      createStepContext(),
    );
    expect(steps).toHaveLength(1);
    expect(steps[0].text.length).toBeLessThanOrEqual(160);
    expect(steps[0].uses.map((u) => u.ingredientId)).toEqual(["o", "g", "j", "c"]);
  });

  it("lets a bare 'cook' inherit the technique of the previous cooking step", () => {
    const ctx = createStepContext();
    structureStep("Place the pork in the oven.", [], ctx);
    const [s] = structureStep("Cook for 15 minutes and baste with the marinade.", [], ctx);
    expect(s.technique).toBe("bake");
  });
});

describe("structureStep lists and conflicts", () => {
  it("folds a list of ingredient names under a colon into the next action", () => {
    const list = [ing("gs", "garlic salt"), ing("bs", "brown sugar"), ing("os", "oyster sauce")];
    const text = "To a bowl, we'll add:\n\ngarlic salt\n\nbrown sugar\n\noyster sauce\n\nMix the marinade until smooth.";
    const steps = structureStep(text, list, createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].technique).toBe("whisk");
    expect(steps[0].uses.map((u) => u.ingredientId)).toEqual(["gs", "bs", "os"]);
  });

  it("turns a list of short instructions under a colon into sentences", () => {
    const text = "We'll start by washing the rice:\n\nFill the bowl with water\n\nMassage the rice\n\nDrain the water";
    const steps = structureStep(text, [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].technique).toBe("drain");
    expect(steps[0].text).toContain("Fill the bowl with water.");
  });

  it("splits when a different workstation starts, even if the second sentence is only a hint", () => {
    const steps = structureStep(
      "Add oil to the marinated beef. Heat the wok on the highest heat for 1 minute.",
      [],
      createStepContext(),
    );
    expect(steps.map((s) => s.technique)).toEqual(["marinate", "fry"]);
    expect(steps[1].timer?.seconds).toBe(60);
  });

  it("drops 'you can also' options", () => {
    const steps = structureStep("Stir-fry for 2 minutes. You can also use chopsticks to mix.", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].text).toBe("Stir-fry for 2 minutes.");
    expect(steps[0].timer?.seconds).toBe(120);
  });

  it("keeps a hint about the heat with the step it belongs to", () => {
    const steps = structureStep("Heat a pan on high heat and add the oil. Lower to medium heat after 10 seconds.", [], createStepContext());
    expect(steps).toHaveLength(1);
    expect(steps[0].heat).toBe("high");
  });

  it("labels the timer from the sentence that holds it", () => {
    const steps = structureStep(
      "Once the char siu has finished its cycle, baste it with honey. Let the char siu cool for 5 minutes.",
      [],
      createStepContext(),
    );
    expect(steps.at(-1)?.timer?.label).toBe("Char siu resting");
  });
});

describe("structureStep wording", () => {
  const first = (text: string) => structureStep(text, [], createStepContext())[0];

  it.each([
    ["Make sure to drain this water so you're not adding moisture.", "Drain this water."],
    ["Wipe each piece dry to ensure a better sear.", "Wipe each piece dry."],
    ["Now that the 2 minutes are up, it's time to fluff the rice!", "Fluff the rice!"],
    ["We'll partially cover the pot and wait.", "Partially cover the pot and wait."],
    ["Then, add the salt.", "Add the salt."],
    ["Anyway, if you're happy with the rice, start whisking the pot.", "If you're happy with the rice, start whisking the pot."],
  ])("%s", (input, expected) => {
    expect(first(input).text).toBe(expected);
  });

  it("trims cues at the next action", () => {
    expect(first("Mix until the meat is fully coated and set it aside.").cue).toBe("The meat is fully coated");
  });

  it("drops longer heading lines", () => {
    const steps = structureStep("Scoop all the way to the bottom\n\nStir the rice with the spatula.", [], createStepContext());
    expect(steps.map((s) => s.text)).toEqual(["Stir the rice with the spatula."]);
  });
});

describe("ingredient matching", () => {
  it("links a generic head noun to the first matching ingredient only", () => {
    const list = [ing("soy", "soy sauce"), ing("oyster", "oyster sauce")];
    const [s] = structureStep("Pour the sauce into the pan.", list, createStepContext());
    expect(s.uses.map((u) => u.ingredientId)).toEqual(["soy"]);
  });

  it("prefers an ingredient whose whole name matches", () => {
    const list = [ing("b", "basin water"), ing("w", "water")];
    const [s] = structureStep("Add water to the pot.", list, createStepContext());
    expect(s.uses.map((u) => u.ingredientId)).toEqual(["w"]);
  });
});

describe("attachUnusedIngredients", () => {
  it("attaches orphans to the first whisk/marinate/season step and warns", () => {
    const ingredients = [ing("a", "salt"), ing("b", "flour")];
    const ctx = createStepContext();
    const steps = [
      ...structureStep("Chop the parsley.", ingredients, ctx),
      ...structureStep("Whisk the batter until smooth.", ingredients, ctx),
    ];
    attachUnusedIngredients(steps, ingredients, ctx);
    expect(steps[1].uses.map((u) => u.ingredientId).sort()).toEqual(["a", "b"]);
    expect(ctx.warnings.filter((w) => w.includes("salt") || w.includes("flour"))).toHaveLength(2);
  });

  it("prefers a step that mentions the seasonings and does not warn about it", () => {
    const ingredients = [ing("e", "egg"), ing("a", "salt"), ing("b", "sugar")];
    const ctx = createStepContext();
    const steps = [
      ...structureStep("Whisk the egg until smooth.", ingredients, ctx),
      ...structureStep("Toss the cubes with the flavors for a minute.", ingredients, ctx),
    ];
    attachUnusedIngredients(steps, ingredients, ctx);
    expect(steps[0].uses.map((u) => u.ingredientId)).toEqual(["e"]);
    expect(steps[1].uses.map((u) => u.ingredientId).sort()).toEqual(["a", "b"]);
    expect(ctx.warnings.filter((w) => w.includes("salt") || w.includes("sugar"))).toHaveLength(0);
  });

  it("falls back to the first step", () => {
    const ingredients = [ing("a", "salt")];
    const ctx = createStepContext();
    const steps = structureStep("Chop the parsley.", ingredients, ctx);
    attachUnusedIngredients(steps, ingredients, ctx);
    expect(steps[0].uses.map((u) => u.ingredientId)).toEqual(["a"]);
  });
});
