import { notFound } from "next/navigation";
import { RecipeEditor } from "@/components/editor/RecipeEditor";
import Link from "next/link";
import { display, textLink } from "@/components/ui/styles";
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
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-6 md:py-10">
        <Link href={`/recipes/${recipe.id}`} className={`${textLink} inline-flex min-h-11 items-center`}>
          Back to recipe
        </Link>
        <p className="label-caps mt-6">Edit recipe</p>
        <h1 className={`${display} mb-8 mt-2 text-3xl sm:text-4xl`}>{recipe.title}</h1>
        <RecipeEditor initial={editableOf(recipe)} recipeId={recipe.id} />
      </main>
    </div>
  );
}
