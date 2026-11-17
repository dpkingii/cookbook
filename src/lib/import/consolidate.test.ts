import { describe, expect, it } from "vitest";
import type { Step } from "@/lib/recipe/types";
import { consolidate } from "./consolidate";

const step = (text: string, technique: Step["technique"], extra: Partial<Step> = {}): Step => ({ text, technique, uses: [], ...extra });

describe("consolidate", () => {
  it("folds a bare filler step into the step before it", () => {
    const out = consolidate([step("Stir-fry the beef until browned.", "fry", { uses: [{ ingredientId: "beef" }] }), step("Mix well.", "whisk")]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("Stir-fry the beef until browned. Mix well.");
  });

  it("folds a bare heat adjustment into the cooking step before it", () => {
    const out = consolidate([
      step("Fry the garlic on high heat.", "fry", { heat: "high", uses: [{ ingredientId: "garlic" }] }),
      step("Turn the heat to low.", "fry", { heat: "low" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].heat).toBe("high");
  });

  it("keeps a heat step that does real work", () => {
    const out = consolidate([
      step("Fry the garlic on high heat.", "fry", { heat: "high" }),
      step("Simmer on low heat.", "simmer", { heat: "low", timer: { seconds: 600, mode: "background", label: "Simmer" } }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("drops a lone 'enjoy' after a plating step", () => {
    const out = consolidate([step("Spoon the soup into bowls.", "plate"), step("Enjoy!", "plate")]);
    expect(out.map((s) => s.text)).toEqual(["Spoon the soup into bowls."]);
  });

  it("keeps a filler step that carries a timer, heat or ingredients", () => {
    const out = consolidate([
      step("Boil the water.", "boil"),
      step("Wait.", "rest", { timer: { seconds: 60, mode: "background", label: "Wait" } }),
      step("Add salt.", "season", { uses: [{ ingredientId: "salt" }] }),
    ]);
    expect(out).toHaveLength(3);
  });

  it("merges neighbouring untimed prep steps only in long recipes", () => {
    const prep = (n: number) => Array.from({ length: n }, (_, i) => step(`Slice item ${i}.`, "slice", { uses: [{ ingredientId: `i${i}` }] }));
    expect(consolidate(prep(4))).toHaveLength(4);
    const long = [...prep(5), ...Array.from({ length: 9 }, (_, i) => step(`Fry batch ${i} in the pan.`, "fry", { timer: { seconds: 30, mode: "stay", label: "Fry" } }))];
    const out = consolidate(long);
    expect(out.length).toBeLessThan(long.length);
    expect(out[0].uses.map((u) => u.ingredientId)).toEqual(["i0", "i1", "i2", "i3", "i4"].slice(0, out[0].uses.length));
    expect(out.every((s) => s.text.length <= 160)).toBe(true);
  });

  it("never merges across a timer or different techniques", () => {
    const long = Array.from({ length: 14 }, (_, i) => step(`Boil pot ${i}.`, "boil", { timer: { seconds: 60, mode: "background", label: "Boil" } }));
    expect(consolidate(long)).toHaveLength(14);
  });

  it("in a very long recipe, folds an untimed setup step into the timed step on the same station", () => {
    const timer = { seconds: 30, mode: "stay" as const, label: "Fry" };
    const pairs = Array.from({ length: 8 }, (_, i) => [
      step(`Heat pan ${i}.`, "fry", { heat: "high" }),
      step(`Fry batch ${i}.`, "fry", { timer, uses: [{ ingredientId: `b${i}` }] }),
    ]).flat();
    const out = consolidate(pairs);
    expect(out).toHaveLength(8);
    expect(out[0]).toMatchObject({ text: "Heat pan 0. Fry batch 0.", technique: "fry", heat: "high", timer });
  });

  it("leaves setup steps alone when the recipe is not long", () => {
    const timer = { seconds: 30, mode: "stay" as const, label: "Fry" };
    const out = consolidate([step("Heat the pan.", "fry"), step("Fry the beef.", "fry", { timer })]);
    expect(out).toHaveLength(2);
  });

  it("keeps a lone step", () => {
    expect(consolidate([step("Mix well.", "whisk")])).toHaveLength(1);
  });
});
