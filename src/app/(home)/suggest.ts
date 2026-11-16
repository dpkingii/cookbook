import { listCatalogueTechniques } from "@/lib/db/browse";
import { getRecipe } from "@/lib/db/recipes";
import type { Technique } from "@/lib/recipe/types";
import { nextUp, type FinishedSession } from "@/lib/stats";

const ROUTINE: Technique[] = ["season", "plate", "rest", "chill", "drain"];

const worthNaming = (techniques: Technique[]) => techniques.find((t) => !ROUTINE.includes(t)) ?? techniques[0];

/** The recipe that teaches the most techniques the viewer has not practised; for a newcomer, the shortest easy one. */
export async function suggestNext(viewerId: string | null, finished: readonly FinishedSession[]) {
  const catalogue = await listCatalogueTechniques(viewerId);
  const hasHistory = finished.some((s) => s.plausible);
  const easy = catalogue.filter((r) => r.difficulty === "easy");
  const pool = hasHistory || easy.length === 0 ? catalogue : [easy.toSorted((a, b) => a.steps.length - b.steps.length)[0]];
  const pick = nextUp(finished, pool, 1)[0];
  if (!pick) return null;
  const recipe = await getRecipe(pick.recipe.id, viewerId);
  return recipe ? { recipe, teaches: worthNaming(pick.newTechniques) } : null;
}
