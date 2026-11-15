import Link from "next/link";
import { Stage } from "@/components/stage";
import type { StoredRecipe } from "@/lib/db/recipes";

function coverStep(recipe: StoredRecipe) {
  const i = recipe.steps.findLastIndex((s) => s.heat);
  return i === -1 ? recipe.steps.length - 1 : i;
}

export function RecipeCard({ recipe, showVisibility }: { recipe: StoredRecipe; showVisibility?: boolean }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex h-full flex-col rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-3 shadow-[5px_5px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--tomato)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--gold)]"
    >
      <Stage recipe={recipe} stepIndex={coverStep(recipe)} progress={0.8} />
      <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
          {recipe.cuisine} · {recipe.difficulty}
          {showVisibility && ` · ${recipe.isPublic ? "public" : "private"}`}
        </p>
        <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight">{recipe.title}</h3>
        <p className="mt-auto pt-3 text-base text-[var(--ink-soft)]">
          {recipe.prepMinutes + recipe.cookMinutes} min · {recipe.steps.length} steps
          {recipe.source && ` · ${recipe.source.name}`}
        </p>
      </div>
    </Link>
  );
}
