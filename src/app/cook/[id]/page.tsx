import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { CookPlayer } from "@/components/cook/CookPlayer";
import { getRecipe } from "@/lib/db/recipes";
import { listPastCooks } from "@/lib/sessions/past";
import { viewerTimeZone } from "@/lib/stats/viewer-time-zone";

export async function generateMetadata({ params }: PageProps<"/cook/[id]">) {
  const viewerId = (await getViewer())?.id ?? null;
  const recipe = await getRecipe((await params).id, viewerId);
  return { title: recipe && `Cooking: ${recipe.title}` };
}

export default async function CookPage({ params }: PageProps<"/cook/[id]">) {
  const viewerId = (await getViewer())?.id ?? null;
  const recipe = await getRecipe((await params).id, viewerId);
  if (!recipe) notFound();
  const past = viewerId ? await listPastCooks(viewerId, recipe.id, await viewerTimeZone()) : [];
  return <CookPlayer recipe={recipe} past={past} />;
}
