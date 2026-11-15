import { notFound } from "next/navigation";
import { CookPlayer } from "@/components/cook/CookPlayer";
import { getRecipe } from "@/lib/db/recipes";

export async function generateMetadata({ params }: PageProps<"/cook/[id]">) {
  const viewerId = null;
  const recipe = await getRecipe((await params).id, viewerId);
  return { title: recipe && `Cooking: ${recipe.title}` };
}

export default async function CookPage({ params }: PageProps<"/cook/[id]">) {
  const viewerId = null;
  const recipe = await getRecipe((await params).id, viewerId);
  if (!recipe) notFound();
  return <CookPlayer recipe={recipe} />;
}
