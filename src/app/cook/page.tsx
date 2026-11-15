import { CookPlayer } from "@/components/cook/CookPlayer";
import { DEMO_RECIPE } from "@/lib/recipe/demo";

export const metadata = { title: `Cooking: ${DEMO_RECIPE.title}` };

export default function CookPage() {
  return <CookPlayer recipe={DEMO_RECIPE} />;
}
