import type { Recipe } from "@/lib/recipe/types";

export type RecipeDraft = Omit<Recipe, "id"> & { warnings: string[] };
