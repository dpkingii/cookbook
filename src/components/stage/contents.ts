import {
  stationOf,
  type Heat,
  type Ingredient,
  type Recipe,
  type Step,
  type Technique,
} from "@/lib/recipe/types";

/**
 * A vessel is a physical thing on the counter. It differs from a station
 * because a simmer usually happens in the pan the aromatics are already in,
 * not in the pot of pasta water.
 */
export type Vessel = "board" | "bowl" | "microwave" | "cooker" | "pan" | "pot" | "oven" | "plate";

/** Left-to-right order along the counter, so a station change pans the camera the right way. */
export const COUNTER: Vessel[] = ["board", "bowl", "microwave", "cooker", "pan", "pot", "oven", "plate"];

/** Appliances named in the step text win over the technique: "cook it in a rice cooker" is not a pot on a burner. */
const APPLIANCES: [RegExp, Vessel][] = [
  [/\brice cooker\b/i, "cooker"],
  [/\bmicrowav/i, "microwave"],
];

/** Appliances cook whatever is in them without a burner, and keep it there until it is taken out. */
const APPLIANCE: Vessel[] = ["cooker", "microwave"];

export interface Item {
  ingredient: Ingredient;
  /** Arrived in this vessel during the current step. */
  fresh: boolean;
  /** Passed over the board at some point, so it is in pieces. */
  cut: boolean;
  /** Step index it arrived in this vessel. */
  since: number;
  /** Heated steps it has been through, the current one counting as `progress`. */
  cooked: number;
  /** Came along with the rest of a vessel's contents (tipped onto a plate), rather than being added on its own. */
  carried: boolean;
}

export interface Scene {
  vessel: Vessel;
  step: Step;
  technique: Technique;
  heat: Heat | null;
  progress: number | null;
  items: Item[];
  /** Ingredients this step uses, in order, whether or not they are new to the vessel. */
  uses: Ingredient[];
  /** The pot holds water (it was set to boil at some point). */
  water: boolean;
  /** The vessel was already hot from an earlier step, so a boil is already rolling. */
  warmed: boolean;
}

const HEATED: Vessel[] = ["pan", "pot", "oven", "cooker", "microwave"];

function vesselFor(steps: Step[], j: number, loc: Map<string, Vessel>): Vessel {
  const step = steps[j];
  for (const [re, v] of APPLIANCES) if (re.test(step.text)) return v;
  const station = stationOf(step);
  if (station === "rest" && step.technique !== "plate") {
    // "Leave the rice covered to steam" happens in the rice cooker, not on a plate.
    const at = new Set(step.uses.map((u) => loc.get(u.ingredientId)));
    const only = at.size === 1 ? [...at][0] : undefined;
    if (only && APPLIANCE.includes(only)) return only;
  }
  if (station === "rest") return "plate";
  if (station !== "pot") return station;
  if (step.technique !== "simmer") return "pot";
  for (let k = j - 1; k >= 0; k--) {
    const s = stationOf(steps[k]);
    if (s === "pan") {
      const panHasFood = [...loc.values()].some((v) => v === "pan");
      return panHasFood ? "pan" : "pot";
    }
    if (s === "pot") return "pot";
  }
  return "pot";
}

export function sceneAt(recipe: Recipe, stepIndex: number, progress: number | null): Scene {
  const steps = recipe.steps;
  const i = Math.max(0, Math.min(steps.length - 1, stepIndex));
  const byId = new Map(recipe.ingredients.map((ing) => [ing.id, ing]));

  const loc = new Map<string, Vessel>();
  const since = new Map<string, number>();
  const cut = new Set<string>();
  const cooked = new Map<string, number>();
  const carried = new Set<string>();
  const heatedBefore = new Set<Vessel>();
  let water = false;
  let vessel: Vessel = "board";
  let prevVessel: Vessel | null = null;

  for (let j = 0; j <= i; j++) {
    const step = steps[j];
    vessel = vesselFor(steps, j, loc);
    const current = j === i;

    // "Roast on the upper rack" names nothing: whatever was just dressed is what goes in.
    const ovenEmpty =vessel === "oven" && ![...loc.values()].includes("oven");
    const slideIn = ovenEmpty && step.uses.length === 0 && prevVessel !== "oven";
    if (prevVessel && ((vessel === "plate" && prevVessel !== "plate") || slideIn)) {
      for (const [id, v] of loc) {
        if (v === prevVessel) {
          loc.set(id, vessel);
          since.set(id, j);
          carried.add(id);
        }
      }
    }

    for (const use of step.uses) {
      if (!byId.has(use.ingredientId)) continue;
      if (loc.get(use.ingredientId) !== vessel) {
        since.set(use.ingredientId, j);
        carried.delete(use.ingredientId);
      }
      loc.set(use.ingredientId, vessel);
      if (vessel === "board") cut.add(use.ingredientId);
    }

    if (vessel === "pot" && step.technique === "boil") water = true;
    if (vessel === "pot" && step.technique === "drain" && !current) water = false;

    const appliance = APPLIANCE.includes(vessel) && stationOf(step) !== "rest";
    if ((step.heat || appliance) && HEATED.includes(vessel)) {
      const amount = current ? (progress ?? 0) : 1;
      for (const [id, v] of loc) {
        if (v === vessel) cooked.set(id, (cooked.get(id) ?? 0) + amount);
      }
      if (!current) heatedBefore.add(vessel);
    }
    if (!current && !step.heat && !appliance) heatedBefore.delete(vessel);
    prevVessel = vessel;
  }

  const step = steps[i];
  const items: Item[] = [];
  for (const [id, v] of loc) {
    if (v !== vessel) continue;
    const ingredient = byId.get(id);
    if (!ingredient) continue;
    items.push({
      ingredient,
      fresh: since.get(id) === i,
      cut: cut.has(id),
      since: since.get(id) ?? i,
      cooked: cooked.get(id) ?? 0,
      carried: carried.has(id),
    });
  }
  items.sort((a, b) => a.since - b.since);

  const uses = step.uses
    .map((u) => byId.get(u.ingredientId))
    .filter((x): x is Ingredient => Boolean(x));

  return {
    vessel,
    step,
    technique: step.technique,
    heat: step.heat ?? null,
    progress,
    items,
    uses,
    water: vessel === "pot" && water,
    warmed: heatedBefore.has(vessel),
  };
}
