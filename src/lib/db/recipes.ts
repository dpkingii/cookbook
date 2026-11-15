import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Difficulty } from "@/lib/recipe/types";
import { prisma } from "./client";
import { buildRecipeRows, recipeInclude, toStoredRecipe } from "./mapping";
import type { RecipeInput, StoredRecipe } from "./mapping";

export type { RecipeInput, StoredRecipe };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listRecipes(opts: {
  viewerId: string | null;
  scope?: "catalogue" | "mine" | "favorites";
  cuisine?: string;
  difficulty?: Difficulty;
  q?: string;
}): Promise<StoredRecipe[]> {
  const { viewerId, scope = "catalogue", cuisine, difficulty } = opts;
  const q = opts.q?.trim();
  if (scope !== "catalogue" && !viewerId) return [];

  const and: Prisma.RecipeWhereInput[] = [];
  if (scope === "catalogue") {
    and.push({ OR: viewerId ? [{ isPublic: true }, { userId: viewerId }] : [{ isPublic: true }] });
  } else if (scope === "mine") {
    and.push({ userId: viewerId });
  } else {
    and.push({ favoritedBy: { some: { userId: viewerId! } } });
  }
  if (cuisine) and.push({ cuisine: { name: cuisine } });
  if (difficulty) and.push({ difficulty });
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { ingredients: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  const rows = await prisma.recipe.findMany({
    where: { AND: and },
    include: recipeInclude(viewerId),
    orderBy: [{ createdAt: scope === "catalogue" ? "asc" : "desc" }, { id: "asc" }],
  });
  return rows.map(toStoredRecipe);
}

export async function getRecipe(id: string, viewerId: string | null): Promise<StoredRecipe | null> {
  if (!UUID.test(id)) return null;
  const row = await prisma.recipe.findFirst({
    where: { id, OR: viewerId ? [{ isPublic: true }, { userId: viewerId }] : [{ isPublic: true }] },
    include: recipeInclude(viewerId),
  });
  return row ? toStoredRecipe(row) : null;
}

export async function createRecipe(input: RecipeInput, ownerId: string): Promise<string> {
  const id = randomUUID();
  const rows = buildRecipeRows(input, id);

  await prisma.$transaction(async (tx) => {
    const cuisine = await tx.cuisine.upsert({
      where: { name: rows.cuisineName },
      update: {},
      create: { name: rows.cuisineName },
    });
    await tx.recipe.create({
      data: { id, userId: ownerId, cuisineId: cuisine.id, isPublic: rows.isPublic ?? false, ...rows.fields },
    });
    await tx.recipeIngredient.createMany({ data: rows.ingredients });
    await tx.recipeStep.createMany({ data: rows.steps });
    await tx.stepIngredient.createMany({ data: rows.uses });
  });
  return id;
}

export async function updateRecipe(id: string, input: RecipeInput, ownerId: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = buildRecipeRows(input, id);

  return prisma.$transaction(async (tx) => {
    const owned = await tx.recipe.findFirst({ where: { id, userId: ownerId }, select: { id: true } });
    if (!owned) return false;

    const cuisine = await tx.cuisine.upsert({
      where: { name: rows.cuisineName },
      update: {},
      create: { name: rows.cuisineName },
    });
    await tx.recipe.update({
      where: { id },
      data: { cuisineId: cuisine.id, isPublic: rows.isPublic, ...rows.fields },
    });
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.recipeStep.deleteMany({ where: { recipeId: id } });
    await tx.recipeIngredient.createMany({ data: rows.ingredients });
    await tx.recipeStep.createMany({ data: rows.steps });
    await tx.stepIngredient.createMany({ data: rows.uses });
    return true;
  });
}

export async function deleteRecipe(id: string, ownerId: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { count } = await prisma.recipe.deleteMany({ where: { id, userId: ownerId } });
  return count > 0;
}

export async function setFavorite(recipeId: string, userId: string, on: boolean): Promise<void> {
  if (on) {
    await prisma.favoriteRecipe.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: {},
      create: { userId, recipeId },
    });
  } else {
    await prisma.favoriteRecipe.deleteMany({ where: { userId, recipeId } });
  }
}

export async function listCuisines(): Promise<string[]> {
  const rows = await prisma.cuisine.findMany({
    where: { recipes: { some: { isPublic: true } } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return rows.map((c) => c.name);
}
