import { describe, expect, it } from "vitest";
import { detectTimer, parseDuration } from "./timer";
import type { Technique } from "@/lib/recipe/types";

describe("detectTimer seconds and mode", () => {
  const cases: [string, Technique, number | undefined, "stay" | "background" | undefined][] = [
    ["Simmer the sauce for 8–10 minutes.", "simmer", 540, "background"],
    ["Simmer for 8-10 minutes", "simmer", 540, "background"],
    ["Cook about 1 hour.", "bake", 3600, "background"],
    ["Cook for 1 1/2 hours.", "simmer", 5400, "background"],
    ["Stir-fry for 30 seconds.", "fry", 30, "stay"],
    ["Sear 20-30 seconds per side.", "sear", 25, "stay"],
    ["Stir-fry for 2 minutes.", "fry", 120, "stay"],
    ["Stir-fry for 5 minutes.", "fry", 300, "background"],
    ["Boil for 2 minutes.", "boil", 120, "background"],
    ["Marinate overnight.", "marinate", 28800, "background"],
    ["Let the pork marinate overnight, or at least for around 6 to 8 hours.", "marinate", 25200, "background"],
    ["Let it rest for half an hour.", "rest", 1800, "background"],
    ["Chill for an hour.", "chill", 3600, "background"],
    ["Fry for a minute.", "fry", 60, "stay"],
    ["Rest 5 min.", "rest", 300, "background"],
    ["Bake at 180°C for 20 mins.", "bake", 1200, "background"],
    ["Knead for 1 to 2 minutes.", "knead", 90, "stay"],
    ["Cook for 1.5 hours.", "simmer", 5400, "background"],
    ["Whisk for 30 seconds to 1 minute.", "whisk", 45, "stay"],
    ["Leave it for a couple of minutes.", "rest", 120, "background"],
    ["Cook for 2 minutes, then flip and cook for 1 minute.", "saute", 120, "stay"],
    ["Cook for 1 minute and a half.", "simmer", 90, "background"],
    ["Leave it covered for 2 additional minutes.", "simmer", 120, "background"],
    ["Prepare a 30-minute meal.", "chop", undefined, undefined],
    ["Chop the onion.", "chop", undefined, undefined],
    ["Baste every 5 minutes.", "roast", undefined, undefined],
    ["Do not marinate for more than 24 hours.", "marinate", undefined, undefined],
    ["Heat the oven to 350°F.", "bake", undefined, undefined],
  ];
  it.each(cases)("%s", (text, technique, seconds, mode) => {
    const t = detectTimer(text, technique);
    expect(t?.seconds).toBe(seconds);
    expect(t?.mode).toBe(mode);
  });
});

describe("detectTimer label", () => {
  const cases: [string, Technique, string][] = [
    ["Simmer the sauce for 10 minutes.", "simmer", "Sauce simmering"],
    ["Roast for 15 minutes, then baste.", "roast", "Roast"],
    ["Stir-fry the beef for 1 minute.", "fry", "Beef frying"],
    ["Let the char siu cool for 5 minutes before cutting into it.", "rest", "Char siu resting"],
    ["Bake for 30 minutes.", "bake", "Bake"],
    ["Baste with the pork marinade and bake for 15 minutes.", "bake", "Bake"],
    ["Marinate the chicken overnight.", "marinate", "Chicken marinating"],
    ["Cook the rice in a large pot of boiling water for 12 minutes.", "boil", "Rice boiling"],
  ];
  it.each(cases)("%s", (text, technique, label) => {
    expect(detectTimer(text, technique)?.label).toBe(label);
  });

  it("keeps labels short", () => {
    const t = detectTimer("Simmer the extraordinarily long named mushroom reduction for 10 minutes.", "simmer");
    expect(t!.label.length).toBeLessThanOrEqual(24);
  });
});

describe("parseDuration", () => {
  it("handles ISO-8601 durations", () => {
    expect(parseDuration("PT25M")).toBe(25);
    expect(parseDuration("PT1H30M")).toBe(90);
    expect(parseDuration("P1DT2H")).toBe(26 * 60);
    expect(parseDuration("PT45S")).toBe(1);
    expect(parseDuration("nonsense")).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
  });
});
