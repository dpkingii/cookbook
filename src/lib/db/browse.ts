import type { Prisma } from "@prisma/client";
import type { Difficulty, Recipe } from "@/lib/recipe/types";
import type { CatalogueRecipe } from "@/lib/stats";
import { PAGE_SIZE } from "@/components/site/Pager";
import { RESUME_WINDOW_MS } from "@/lib/sessions/queries";
import { prisma } from "./client";

/** Read-only queries for lists: one flat row per recipe, no steps or ingredients loaded. */

const NO_USER = "00000000-0000-0000-0000-000000000000";

export interface RecipeRow {
  id: string;
  title: string;
  cuisine: string;
  difficulty: Difficulty;
  minutes: number;
  steps: number;
  favorited: boolean;
  isPublic: boolean;
  cooked: number;
}

const rowSelect = (viewerId: string | null) =>
  ({
    id: true,
    title: true,
    difficulty: true,
    prepMinutes: true,
    cookMinutes: true,
    isPublic: true,
    cuisine: { select: { name: true } },
    _count: { select: { steps: true } },
    favoritedBy: { where: { userId: viewerId ?? NO_USER }, select: { id: true } },
  }) satisfies Prisma.RecipeSelect;

type Row = Prisma.RecipeGetPayload<{ select: ReturnType<typeof rowSelect> }>;

const visibleTo = (viewerId: string | null): Prisma.RecipeWhereInput =>
  viewerId ? { OR: [{ isPublic: true }, { userId: viewerId }] } : { isPublic: true };

async function cookedCounts(viewerId: string | null, ids: string[]) {
  if (!viewerId || ids.length === 0) return new Map<string, number>();
  const groups = await prisma.cookingSession.groupBy({
    by: ["recipeId"],
    where: { userId: viewerId, recipeId: { in: ids }, finishedAt: { not: null }, plausible: true },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.recipeId!, g._count._all]));
}

async function toRows(rows: Row[], viewerId: string | null): Promise<RecipeRow[]> {
  const cooked = await cookedCounts(viewerId, rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine?.name ?? "Other",
    difficulty: r.difficulty,
    minutes: r.prepMinutes + r.cookMinutes,
    steps: r._count.steps,
    favorited: r.favoritedBy.length > 0,
    isPublic: r.isPublic,
    cooked: cooked.get(r.id) ?? 0,
  }));
}

export interface RecipeQuery {
  viewerId: string | null;
  scope?: "catalogue" | "mine" | "favorites";
  cuisine?: string;
  difficulty?: Difficulty;
  q?: string;
}

function whereFor({ viewerId, scope = "catalogue", cuisine, difficulty, q }: RecipeQuery): Prisma.RecipeWhereInput | null {
  if (scope !== "catalogue" && !viewerId) return null;
  const and: Prisma.RecipeWhereInput[] = [];
  if (scope === "catalogue") and.push(visibleTo(viewerId));
  else if (scope === "mine") and.push({ userId: viewerId });
  else and.push({ favoritedBy: { some: { userId: viewerId! } } });
  if (cuisine) and.push({ cuisine: { name: cuisine } });
  if (difficulty) and.push({ difficulty });
  const text = q?.trim();
  if (text) {
    and.push({
      OR: [
        { title: { contains: text, mode: "insensitive" } },
        { ingredients: { some: { name: { contains: text, mode: "insensitive" } } } },
      ],
    });
  }
  return { AND: and };
}

export async function listRecipePage(query: RecipeQuery & { page?: string }) {
  const where = whereFor(query);
  if (!where) return { rows: [], total: 0, page: 1, pages: 1 };
  const total = await prisma.recipe.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const rows = await prisma.recipe.findMany({
    where,
    select: rowSelect(query.viewerId),
    orderBy: [{ createdAt: query.scope === "mine" || query.scope === "favorites" ? "desc" : "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return { rows: await toRows(rows, query.viewerId), total, page, pages };
}

export async function listFavouriteRows(viewerId: string, take?: number) {
  const rows = await prisma.recipe.findMany({
    where: { AND: [visibleTo(viewerId), { favoritedBy: { some: { userId: viewerId } } }] },
    select: rowSelect(viewerId),
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
  });
  return toRows(rows, viewerId);
}

export async function listCuisineNames(): Promise<string[]> {
  const rows = await prisma.cuisine.findMany({
    where: { recipes: { some: { isPublic: true } } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return rows.map((c) => c.name);
}

/** Every recipe the viewer can see, with only the technique of each step: enough for "next to learn". */
export async function listCatalogueTechniques(viewerId: string | null): Promise<CatalogueRecipe[]> {
  const rows = await prisma.recipe.findMany({
    where: visibleTo(viewerId),
    select: {
      id: true,
      title: true,
      difficulty: true,
      cuisine: { select: { name: true } },
      steps: { select: { technique: true }, orderBy: { position: "asc" } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine?.name ?? "Other",
    difficulty: r.difficulty,
    steps: r.steps,
  }));
}

export interface InProgress {
  recipeId: string;
  title: string;
  step: number;
  steps: number;
}

export async function listInProgress(viewerId: string, now = new Date()): Promise<InProgress[]> {
  const sessions = await prisma.cookingSession.findMany({
    where: {
      userId: viewerId,
      recipeId: { not: null },
      finishedAt: null,
      startedAt: { gte: new Date(now.getTime() - RESUME_WINDOW_MS) },
    },
    select: { id: true, recipeId: true, recipeSnapshot: true, startedAt: true },
    orderBy: { startedAt: "desc" },
  });
  if (sessions.length === 0) return [];

  const entered = await prisma.sessionEvent.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) }, type: "step_entered" },
    select: { sessionId: true, stepIndex: true },
    orderBy: [{ at: "desc" }, { seq: "desc" }],
  });
  const latest = new Map<string, number>();
  for (const e of entered) if (!latest.has(e.sessionId) && e.stepIndex !== null) latest.set(e.sessionId, e.stepIndex);

  const seen = new Set<string>();
  return sessions.flatMap((s) => {
    if (seen.has(s.recipeId!)) return [];
    seen.add(s.recipeId!);
    const recipe = s.recipeSnapshot as unknown as Pick<Recipe, "title" | "steps">;
    const steps = recipe.steps.length;
    return [{ recipeId: s.recipeId!, title: recipe.title, steps, step: Math.min(steps, (latest.get(s.id) ?? 0) + 1) }];
  });
}

/** Distinct recipes from the viewer's latest finished cooks, newest first, that still exist. */
export async function listRecentlyCooked(viewerId: string, take: number): Promise<RecipeRow[]> {
  const sessions = await prisma.cookingSession.findMany({
    where: { userId: viewerId, recipeId: { not: null }, finishedAt: { not: null } },
    select: { recipeId: true },
    orderBy: { finishedAt: "desc" },
    take: take * 8,
  });
  const ids = [...new Set(sessions.map((s) => s.recipeId!))];
  if (ids.length === 0) return [];
  const rows = await prisma.recipe.findMany({
    where: { AND: [{ id: { in: ids } }, visibleTo(viewerId)] },
    select: rowSelect(viewerId),
  });
  const byId = new Map((await toRows(rows, viewerId)).map((r) => [r.id, r]));
  return ids.flatMap((id) => byId.get(id) ?? []).slice(0, take);
}
