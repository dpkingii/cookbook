import { prisma } from "@/lib/db/client";
import { getRecipe } from "@/lib/db/recipes";
import { replay, summary, type PlayerEvent } from "@/lib/player";
import type { Recipe } from "@/lib/recipe/types";
import { fromRow, toRow } from "./rows";

export type IngestResult = { ok: true; finished: boolean } | { ok: false; reason: "forbidden" | "recipe_not_found" };

export interface IngestInput {
  viewerId: string;
  sessionId: string;
  recipeId: string;
  from: number;
  events: PlayerEvent[];
}

function snapshotOf(r: Recipe): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    source: r.source,
    ingredients: r.ingredients,
    steps: r.steps,
  };
}

export async function ingestEvents({ viewerId, sessionId, recipeId, from, events }: IngestInput): Promise<IngestResult> {
  let owner = await prisma.cookingSession.findUnique({ where: { id: sessionId }, select: { userId: true } });

  if (!owner) {
    const recipe = await getRecipe(recipeId, viewerId);
    if (!recipe) return { ok: false, reason: "recipe_not_found" };
    await prisma.cookingSession.createMany({
      data: [
        {
          id: sessionId,
          userId: viewerId,
          recipeId: recipe.id,
          recipeSnapshot: JSON.parse(JSON.stringify(snapshotOf(recipe))),
          startedAt: new Date(Math.min(...events.map((e) => e.at))),
        },
      ],
      skipDuplicates: true,
    });
    owner = await prisma.cookingSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  }
  if (owner?.userId !== viewerId) return { ok: false, reason: "forbidden" };

  await prisma.sessionEvent.createMany({
    data: events.map((event, i) => toRow(sessionId, event, from + i)),
    skipDuplicates: true,
  });

  return { ok: true, finished: await settle(sessionId) };
}

/**
 * Summary columns are always recomputed from the stored events and the recipe
 * snapshot, so nothing the client says about duration or techniques is trusted.
 */
export async function settle(sessionId: string): Promise<boolean> {
  const hasFinish = await prisma.sessionEvent.findFirst({
    where: { sessionId, type: "session_finished" },
    select: { id: true },
  });
  if (!hasFinish) return false;

  const session = await prisma.cookingSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: { recipeSnapshot: true },
  });
  const rows = await prisma.sessionEvent.findMany({ where: { sessionId }, orderBy: [{ at: "asc" }, { seq: "asc" }] });
  const recipe = session.recipeSnapshot as unknown as Recipe;
  const state = replay(recipe, rows.map(fromRow));
  if (state.finishedAt === null) return false;

  const result = summary(state, recipe);
  await prisma.cookingSession.update({
    where: { id: sessionId },
    data: {
      startedAt: new Date(state.startedAt!),
      finishedAt: new Date(state.finishedAt),
      durationSeconds: result.durationSeconds,
      techniques: result.techniques,
      cuisineName: recipe.cuisine,
      difficulty: recipe.difficulty,
      plausible: result.plausible,
      rating: state.rating,
      note: state.note,
    },
  });
  return true;
}
