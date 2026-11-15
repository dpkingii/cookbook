import { notFound } from "next/navigation";
import { RecipeEditor } from "@/components/editor/RecipeEditor";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getViewer } from "@/lib/auth/viewer";
import { getRecipe } from "@/lib/db/recipes";
import { editableOf } from "@/lib/recipes/form";

export const metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.isGuest) notFound();
  const recipe = await getRecipe((await params).id, viewer.id);
  if (!recipe || recipe.ownerId !== viewer.id) notFound();

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">Edit recipe</p>
        <h1 className="mb-8 mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{recipe.title}</h1>
        <RecipeEditor initial={editableOf(recipe)} recipeId={recipe.id} />
      </main>
    </div>
  );
}
