import { describe, expect, it } from "vitest";
import { analyzeTechnique, detectHeat, detectTechnique } from "./technique";
import type { Technique } from "@/lib/recipe/types";

describe("detectTechnique", () => {
  const cases: [string, Technique][] = [
    ["Stir in the chopped garlic and sauté until fragrant.", "saute"],
    ["Chop the onion finely.", "chop"],
    ["Finely dice the carrot.", "chop"],
    ["Mince the garlic and ginger.", "mince"],
    ["Slice the flank steak across the grain.", "slice"],
    ["Cut the pork into long strips.", "slice"],
    ["Slice the carrot thin, then chop into small pieces.", "slice"],
    ["Season the chicken with salt and pepper.", "season"],
    ["Whisk the eggs with the milk.", "whisk"],
    ["Combine the flour, sugar and salt in a large bowl.", "whisk"],
    ["Beat the eggs until smooth.", "whisk"],
    ["Stir together the soy sauce and sugar.", "whisk"],
    ["Mix the marinade, then set aside.", "whisk"],
    ["Gently fold in the whipped cream.", "fold"],
    ["Knead the dough for 10 minutes.", "knead"],
    ["Marinate the chicken in the fridge for 2 hours.", "marinate"],
    ["Let the pork marinate overnight.", "marinate"],
    ["Sear the beef until browned.", "sear"],
    ["Add the oil to the wok and stir-fry the beef.", "fry"],
    ["Stir fry the noodles on high heat.", "fry"],
    ["Fry the eggs until the edges crisp.", "fry"],
    ["Steam the fish for 8 minutes.", "simmer"],
    ["Poach the eggs gently.", "simmer"],
    ["Blanch the broccoli for 2 minutes.", "simmer"],
    ["Braise the short ribs for 3 hours.", "simmer"],
    ["Simmer the sauce for 10 minutes.", "simmer"],
    ["Bring to a boil, then reduce the heat and simmer.", "simmer"],
    ["Bring a large pot of water to a boil.", "boil"],
    ["Boil the pasta until al dente.", "boil"],
    ["Roast the vegetables at 425°F.", "roast"],
    ["Bake for 25 minutes.", "bake"],
    ["Preheat the oven to 350°F.", "bake"],
    ["Grill the steaks for 4 minutes per side.", "broil"],
    ["Broil until the cheese melts.", "broil"],
    ["Wash the rice three times.", "drain"],
    ["Rinse the beans and drain well.", "drain"],
    ["Soak the mushrooms in warm water.", "drain"],
    ["Strain the broth through a sieve.", "drain"],
    ["Serve with the sliced scallions.", "plate"],
    ["Garnish with cilantro and enjoy!", "plate"],
    ["Slice across the grain and serve.", "plate"],
    ["Set the chicken aside.", "rest"],
    ["Let the char siu cool for 5 minutes before cutting into it.", "rest"],
    ["Let stand for 10 minutes.", "rest"],
    ["Refrigerate for 2 hours.", "chill"],
    ["Chill the dough until firm.", "chill"],
    ["Heat the oil in a skillet over medium heat.", "saute"],
    ["Cook the onions until soft, stirring often.", "saute"],
    ["Cook the rice in the rice cooker.", "simmer"],
    ["Pour the batter into the pan and cook until set.", "saute"],
    ["Heat the wok until barely smoking.", "fry"],
    ["Plate the fried rice.", "plate"],
    ["Boil, simmer, wait", "simmer"],
    ["Mix the baking soda and cornstarch in a bowl.", "whisk"],
    ["Wipe each piece dry to ensure a better sear.", "rest"],
    ["Add a little water to help generate some steam.", "rest"],
    ["Spread cornstarch on a flat plate.", "rest"],
    ["Plate and enjoy immediately!", "plate"],
    ["Remove the steamed eggs.", "rest"],
    ["Once the pot is boiling again, partially cover the pot and let it cook at medium heat for 25 minutes.", "simmer"],
    ["As the water starts to boil, add the tofu and give the soup a stir.", "boil"],
    ["Cook the noodles, then set aside.", "saute"],
    ["Put the steamer rack in the wok.", "simmer"],
    ["Pour the mixture into the bowl and cover the wok.", "simmer"],
    ["Add the salt and white pepper.", "season"],
    ["Taste and adjust the flavour.", "season"],
    ["Massage the pork for 2 minutes.", "marinate"],
    ["Massage the rice around with your hands.", "rest"],
    ["Add the oil and mix it around with chopsticks.", "whisk"],
    ["Pour the water-wine mix in and cover the wok.", "simmer"],
    ["Add the chicken broth to a large pot and place over high heat.", "boil"],
    ["Stir the sauce.", "whisk"],
    ["Stir together the soy sauce and sugar.", "whisk"],
    ["Pour the boiled water into a pot.", "boil"],
    ["Let the water cook for 2 minutes before stir frying.", "simmer"],
  ];
  it.each(cases)("%s -> %s", (text, expected) => {
    expect(detectTechnique(text)).toBe(expected);
  });

  it("falls back to rest for text with no recognisable verb", () => {
    expect(detectTechnique("Wait patiently.")).toBe("rest");
    expect(analyzeTechnique("Wait patiently.")).toBeNull();
  });

  it("marks wok/pan hints as weak", () => {
    expect(analyzeTechnique("Heat the pan.")?.weak).toBe(true);
    expect(analyzeTechnique("Sauté the onion.")?.weak).toBe(false);
  });
});

describe("detectHeat", () => {
  const cases: [string, "low" | "medium" | "high" | undefined][] = [
    ["Cook over high heat.", "high"],
    ["Reduce to medium-low heat.", "low"],
    ["Turn the heat to medium low.", "low"],
    ["Cook on medium heat.", "medium"],
    ["On medium-high heat, add the beef.", "high"],
    ["Cook on low.", "low"],
    ["Bring to a simmer.", "low"],
    ["Bring the water to a boil.", "high"],
    ["Turn the heat to low.", "low"],
    ["Bring to a boil then simmer for 10 minutes.", "low"],
    ["Preheat the oven to 450°F.", "high"],
    ["Preheat the oven to 425°F / 218°C.", "high"],
    ["Bake at 350°F.", "medium"],
    ["Bake at 325°F.", "low"],
    ["Roast at 220°C.", "high"],
    ["Roast at 180 °C.", "medium"],
    ["Bake at 150C for an hour.", "low"],
    ["Heat the wok until barely smoking.", "high"],
    ["Heat the wok on the highest heat.", "high"],
    ["Cook on the lowest heat.", "low"],
    ["Turn the heat off.", undefined],
    ["Add water to help prevent the drippings from burning and smoking.", undefined],
    ["Chop the onion.", undefined],
    ["Use low-sodium soy sauce.", undefined],
    ["The internal temperature should reach 120°F (49°C).", undefined],
    ["Lower to medium heat, then raise to high heat.", "medium"],
  ];
  it.each(cases)("%s -> %s", (text, expected) => {
    expect(detectHeat(text)).toBe(expected);
  });
});
