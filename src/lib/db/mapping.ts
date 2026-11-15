import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { TECHNIQUES } from "@/lib/recipe/types";
import type { Recipe, TokenShape } from "@/lib/recipe/types";

export type StoredRecipe = Recipe & {
  ownerId: string | null;
  isPublic: boolean;
  favorited: boolean;
  createdAt: Date;
};

export type RecipeInput = Omit<Recipe, "id"> & { isPublic?: boolean };

const TOKEN_SHAPES = [
  "round",
  "bulb",
  "leaf",
  "long",
  "strand",
  "cube",
  "liquid",
  "grain",
  "wedge",
] as const satisfies readonly TokenShape[];

const NO_USER = "00000000-0000-0000-0000-000000000000";

export const recipeInclude = (viewerId: string | null) =>
  ({
    cuisine: true,
    ingredients: { orderBy: { position: "asc" } },
    steps: { orderBy: { position: "asc" }, include: { ingredients: true } },
    favoritedBy: { where: { userId: viewerId ?? NO_USER }, select: { id: true } },
  }) satisfies Prisma.RecipeInclude;

export type RecipeRow = Prisma.RecipeGetPayload<{ include: ReturnType<typeof recipeInclude> }>;

export function toStoredRecipe(row: RecipeRow): StoredRecipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    cuisine: row.cuisine?.name ?? "Other",
    difficulty: row.difficulty,
    servings: row.servings,
    prepMinutes: row.prepMinutes,
    cookMinutes: row.cookMinutes,
    source: row.sourceName && row.sourceUrl ? { name: row.sourceName, url: row.sourceUrl } : undefined,
    ingredients: row.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      note: ing.note ?? undefined,
      token: { shape: ing.tokenShape as TokenShape, color: ing.tokenColor },
    })),
    steps: row.steps.map((step) => ({
      text: step.text,
      technique: step.technique,
      heat: step.heat ?? undefined,
      timer:
        step.timerSeconds != null && step.timerMode
          ? { seconds: step.timerSeconds, mode: step.timerMode, label: step.timerLabel ?? "" }
          : undefined,
      cue: step.cue ?? undefined,
      uses: step.ingredients.map((use) => ({
        ingredientId: use.ingredientId,
        portion: use.portion === 1 ? undefined : use.portion,
        note: use.note ?? undefined,
      })),
    })),
    ownerId: row.userId,
    isPublic: row.isPublic,
    favorited: row.favoritedBy.length > 0,
    createdAt: row.createdAt,
  };
}

const optionalText = z.string().optional();

const recipeInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string(),
    cuisine: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    servings: z.number().int().positive(),
    prepMinutes: z.number().int().min(0),
    cookMinutes: z.number().int().min(0),
    source: z.object({ name: z.string(), url: z.string() }).optional(),
    isPublic: z.boolean().optional(),
    ingredients: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, "Ingredient name is required"),
        quantity: z.number().nullable(),
        unit: z.string().nullable(),
        note: optionalText,
        token: z.object({ shape: z.enum(TOKEN_SHAPES), color: z.string().min(1) }),
      }),
    ),
    steps: z
      .array(
        z.object({
          text: z.string().trim().min(1, "Step text is required"),
          technique: z.enum(TECHNIQUES),
          heat: z.enum(["low", "medium", "high"]).optional(),
          timer: z
            .object({
              seconds: z.number().int().positive("Timer must be longer than 0 seconds"),
              mode: z.enum(["stay", "background"]),
              label: z.string(),
            })
            .optional(),
          cue: optionalText,
          uses: z.array(
            z.object({
              ingredientId: z.string(),
              portion: z.number().min(0).max(1).optional(),
              note: optionalText,
            }),
          ),
        }),
      )
      .min(1, "A recipe needs at least one step"),
  })
  .superRefine((recipe, ctx) => {
    const ids = new Set<string>();
    for (const ing of recipe.ingredients) {
      if (ids.has(ing.id)) ctx.addIssue({ code: "custom", message: `Duplicate ingredient id "${ing.id}"` });
      ids.add(ing.id);
    }
    recipe.steps.forEach((step, i) => {
      for (const use of step.uses) {
        if (!ids.has(use.ingredientId)) {
          ctx.addIssue({
            code: "custom",
            message: `Step ${i + 1} uses unknown ingredient "${use.ingredientId}"`,
          });
        }
      }
    });
  });

export function parseRecipeInput(input: RecipeInput): z.output<typeof recipeInputSchema> {
  const result = recipeInputSchema.safeParse(input);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return where + issue.message;
    });
    throw new Error(`Invalid recipe. ${problems.join("; ")}`);
  }
  return result.data;
}

export function buildRecipeRows(input: RecipeInput, recipeId: string) {
  const recipe = parseRecipeInput(input);
  const ingredientIds = new Map(recipe.ingredients.map((ing) => [ing.id, randomUUID()]));
  const stepIds = recipe.steps.map(() => randomUUID());

  return {
    cuisineName: recipe.cuisine.trim() || "Other",
    isPublic: recipe.isPublic,
    fields: {
      title: recipe.title.trim(),
      description: recipe.description,
      difficulty: recipe.difficulty,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      servings: recipe.servings,
      sourceName: recipe.source?.name ?? null,
      sourceUrl: recipe.source?.url ?? null,
    },
    ingredients: recipe.ingredients.map(
      (ing, position): Prisma.RecipeIngredientCreateManyInput => ({
        id: ingredientIds.get(ing.id)!,
        recipeId,
        position,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        note: ing.note,
        tokenShape: ing.token.shape,
        tokenColor: ing.token.color,
      }),
    ),
    steps: recipe.steps.map(
      (step, position): Prisma.RecipeStepCreateManyInput => ({
        id: stepIds[position],
        recipeId,
        position,
        text: step.text,
        technique: step.technique,
        heat: step.heat,
        timerSeconds: step.timer?.seconds,
        timerMode: step.timer?.mode,
        timerLabel: step.timer?.label,
        cue: step.cue,
      }),
    ),
    uses: recipe.steps.flatMap((step, i) =>
      step.uses.map(
        (use): Prisma.StepIngredientCreateManyInput => ({
          stepId: stepIds[i],
          ingredientId: ingredientIds.get(use.ingredientId)!,
          portion: use.portion ?? 1,
          note: use.note,
        }),
      ),
    ),
  };
}
