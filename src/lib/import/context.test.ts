import { describe, expect, it } from "vitest";
import { createStepContext, structureStep } from "./steps";

function run(...paragraphs: string[]) {
  const ctx = createStepContext();
  return paragraphs.flatMap((p) => structureStep(p, [], ctx));
}

describe("running vessel context", () => {
  it("lets stir, mix, toss and combine on the heat keep the cooking technique", () => {
    const steps = run(
      "Heat the wok over high heat until smoking, then stir-fry the beef for 2 minutes.",
      "Add the sauce and stir to coat the beef.",
      "Toss everything together.",
      "Mix well.",
    );
    expect(steps.map((s) => s.technique)).toEqual(["fry", "fry", "fry", "fry"]);
  });

  it("keeps the same verbs as whisk in a bowl before any heat", () => {
    const steps = run("Mix the soy sauce and sugar together until dissolved.", "Stir well.", "Toss the cabbage with the dressing.");
    expect(steps.every((s) => s.technique === "whisk")).toBe(true);
  });

  it("keeps a step that names a bowl in the bowl while the wok is hot", () => {
    const steps = run("Stir-fry the beef over high heat for 2 minutes.", "In a small bowl, mix the soy sauce, sugar and water.");
    expect(steps.map((s) => s.technique)).toEqual(["fry", "whisk"]);
  });

  it("lets a mix that lists several ingredients without a vessel be a bowl step", () => {
    const steps = run("Fry the onion over medium heat for 3 minutes.", "Mix the cornstarch, water and soy sauce.");
    expect(steps.map((s) => s.technique)).toEqual(["fry", "whisk"]);
  });

  it("returns to whisk once the food has left the vessel", () => {
    const steps = run(
      "Sear the beef over high heat for 1 minute.",
      "Transfer the beef to a plate and set it aside.",
      "Stir the cornstarch into the water.",
    );
    expect(steps.map((s) => s.technique)).toEqual(["sear", "rest", "whisk"]);
  });

  it("resumes the vessel when the pan is used again", () => {
    const steps = run(
      "Sear the beef over high heat for 1 minute, then take it out of the wok.",
      "Add the onion to the wok and toss for 30 seconds.",
    );
    expect(steps.map((s) => s.technique)).toEqual(["sear", "fry"]);
  });

  it("treats a drained pot as empty", () => {
    const steps = run("Boil the noodles for 3 minutes.", "Drain the noodles.", "Toss the noodles with the sauce.");
    expect(steps.map((s) => s.technique)).toEqual(["boil", "drain", "whisk"]);
  });

  it("lets add and pour carry the pot's technique instead of falling back to rest", () => {
    const steps = run("Bring the water to a boil in a large pot.", "Add the noodles and a pinch of salt.");
    expect(steps.map((s) => s.technique)).toEqual(["boil", "boil"]);
  });

  it("gives a bare 'cook' the technique of the vessel", () => {
    expect(run("Simmer the soup over low heat.", "Cook for 10 minutes.").map((s) => s.technique)).toEqual(["simmer", "simmer"]);
    expect(run("Stir-fry the onion in the wok for 30 seconds.", "Cook for 2 minutes.").map((s) => s.technique)).toEqual(["fry", "fry"]);
  });

  it("names a mix that mentions the wok as frying even without earlier context", () => {
    const [step] = run("Mix the rice and the egg in the wok.");
    expect(step.technique).toBe("fry");
  });
});

describe("running oven and bowl context", () => {
  it("gives a bare 'cook' the technique of the oven the food went into", () => {
    const steps = run("Place the tray in the oven.", "Cook for 15 minutes, then baste the pieces.");
    expect(steps.map((s) => s.technique)).toEqual(["bake", "bake"]);
  });

  it("forgets the oven once the food is taken out", () => {
    const steps = run("Place the tray in the oven.", "Take the tray out of the oven.", "Cook the rice for 10 minutes.");
    expect(steps[2].technique).not.toBe("bake");
  });

  it("calls oven cooking of meat roasting and oven cooking of dough baking", () => {
    const meat = createStepContext();
    const pork = [{ id: "pork", name: "pork shoulder", quantity: 1, unit: "lb", token: { shape: "cube" as const, color: "#fff" } }];
    expect(structureStep("Bake the pork for 30 minutes.", pork, meat)[0].technique).toBe("roast");
    const dough = [...pork, { id: "flour", name: "flour", quantity: 2, unit: "cup", token: { shape: "grain" as const, color: "#fff" } }];
    expect(structureStep("Bake for 30 minutes.", dough, createStepContext())[0].technique).toBe("bake");
  });

  it("treats a mix in the main clause as a bowl step while a lead clause warms the wok, and keeps the wok for later", () => {
    const steps = run("While the wok heats up, mix the cornstarch into the chicken.", "Add the chicken and stir.");
    expect(steps.map((s) => s.technique)).toEqual(["whisk", "fry"]);
  });

  it("reads 'the marinated beef' going into the pan as cooking, and in a bowl as marinating", () => {
    expect(run("Heat the wok over high heat.", "Add the marinated beef and spread it out.").map((s) => s.technique)).toEqual(["fry", "fry"]);
    expect(run("Add the marinated beef to the wok.").map((s) => s.technique)).toEqual(["fry"]);
    expect(run("Add oil to the marinated beef and mix.").map((s) => s.technique)).toEqual(["marinate"]);
  });

  it("keeps mixing in the bowl when the previous step put the food in a bowl while the wok heats", () => {
    const steps = run("Heat the wok over high heat.", "Crack the eggs into a bowl.", "Mix well with a fork.");
    expect(steps.map((s) => s.technique)).toEqual(["fry", "whisk", "whisk"]);
  });
});

describe("running heat context", () => {
  it("carries the heat across steps in the same vessel", () => {
    const steps = run("Stir-fry the beef over high heat for 30 seconds.", "Add the onion and stir-fry for 1 minute.");
    expect(steps.map((s) => s.heat)).toEqual(["high", "high"]);
  });

  it("carries the heat onto a step in the same vessel that states none", () => {
    const steps = run("Fry the onion over high heat for 30 seconds.", "Remove the onion and set it aside.", "Fry the garlic for 20 seconds.");
    expect(steps[2].heat).toBe("high");
  });

  it("applies lower and raise the heat relative to the current heat", () => {
    const steps = run("Fry the garlic over high heat for 20 seconds.", "Lower the heat and fry the sauce for 1 minute.", "Raise the heat and fry the noodles for 1 minute.");
    expect(steps.map((s) => s.heat)).toEqual(["high", "medium", "high"]);
  });

  it("forgets the heat when it is turned off", () => {
    const steps = run("Fry the garlic over high heat for 20 seconds.", "Turn off the heat and stir in the sesame oil.");
    expect(steps.map((s) => s.heat)).toEqual(["high", undefined]);
  });
});
