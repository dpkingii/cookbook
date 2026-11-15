import { notFound } from "next/navigation";
import { CookPlayer } from "@/components/cook/CookPlayer";
import { findRecipe, SEED_RECIPES } from "@/lib/recipe/seed-recipes";

export const generateStaticParams = () => SEED_RECIPES.map((r) => ({ id: r.id }));

export async function generateMetadata({ params }: PageProps<"/cook/[id]">) {
  const recipe = findRecipe((await params).id);
  return { title: recipe && `Cooking: ${recipe.title}` };
}

export default async function CookPage({ params }: PageProps<"/cook/[id]">) {
  const recipe = findRecipe((await params).id);
  if (!recipe) notFound();
  return <CookPlayer recipe={recipe} />;
}
