"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { createRecipe, deleteRecipe, getRecipe, setFavorite, updateRecipe } from "@/lib/db/recipes";
import type { RecipeInput } from "@/lib/db/recipes";
import { draftFromText, fetchRecipeDraft } from "@/lib/import";
import type { RecipeDraft } from "@/lib/import";

export type ActionError = { error: string; needsLogin?: boolean };
export type ImportResult = { draft: RecipeDraft } | ActionError;

const LOGIN_ERROR: ActionError = { error: "Log in to save recipes", needsLogin: true };
const MAX_TEXT = 60_000;

async function member() {
  const viewer = await getViewer();
  return viewer && !viewer.isGuest ? viewer : null;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function importFromText(text: string): Promise<ImportResult> {
  if (typeof text !== "string" || !text.trim()) return { error: "Paste a recipe first." };
  if (text.length > MAX_TEXT) return { error: "That is too long to import. Paste one recipe at a time." };
  try {
    const draft = draftFromText(text);
    if (draft.steps.length === 0 && draft.ingredients.length === 0) {
      return { error: "We could not find ingredients or steps in that text. Paste the ingredient list and the method." };
    }
    return { draft };
  } catch (error) {
    return { error: messageOf(error, "We could not read that recipe.") };
  }
}

export async function importFromUrl(url: string): Promise<ImportResult> {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return { error: "Enter the link to a recipe page." };
  try {
    return { draft: await fetchRecipeDraft(trimmed) };
  } catch (error) {
    return { error: messageOf(error, "We could not fetch that page. Try pasting the recipe text instead.") };
  }
}

function safeSource(source: RecipeInput["source"]): RecipeInput["source"] {
  if (!source) return undefined;
  try {
    const { protocol } = new URL(source.url);
    return protocol === "http:" || protocol === "https:" ? source : undefined;
  } catch {
    return undefined;
  }
}

export async function saveRecipe(input: RecipeInput, id?: string): Promise<ActionError> {
  const viewer = await member();
  if (!viewer) return LOGIN_ERROR;

  const clean = { ...input, source: safeSource(input?.source) };
  let savedId: string;
  try {
    if (id) {
      if (!(await updateRecipe(id, clean, viewer.id))) return { error: "That recipe was not found, or it is not yours to edit." };
      savedId = id;
    } else {
      savedId = await createRecipe(clean, viewer.id);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid recipe")) return { error: error.message };
    console.error("saveRecipe failed", error);
    return { error: "We could not save the recipe. Try again in a moment." };
  }

  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath(`/recipes/${savedId}`);
  redirect(`/recipes/${savedId}`);
}

export async function removeRecipe(id: string): Promise<ActionError> {
  const viewer = await member();
  if (!viewer) return { error: "Log in to delete recipes", needsLogin: true };
  if (!(await deleteRecipe(id, viewer.id))) return { error: "That recipe was not found, or it is not yours to delete." };

  revalidatePath("/");
  revalidatePath("/my");
  redirect("/my");
}

export async function toggleFavorite(recipeId: string, on: boolean): Promise<{ ok: true } | ActionError> {
  const viewer = await member();
  if (!viewer) return { error: "Log in to favourite recipes", needsLogin: true };
  if (!(await getRecipe(recipeId, viewer.id))) return { error: "That recipe was not found." };

  await setFavorite(recipeId, viewer.id, Boolean(on));
  revalidatePath("/my");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true };
}
