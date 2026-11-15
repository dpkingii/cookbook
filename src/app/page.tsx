import Link from "next/link";
import { Stage } from "@/components/stage";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import type { Recipe } from "@/lib/recipe/types";

/** The step that best shows the dish: the last one on a burner or in the oven. */
function coverStep(recipe: Recipe) {
  const i = recipe.steps.findLastIndex((s) => s.heat);
  return i === -1 ? recipe.steps.length - 1 : i;
}

export default function Home() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
          Cookbook
        </p>
        <h1 className="mt-2 max-w-2xl font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">
          Recipes you play, one step at a time.
        </h1>
        <p className="mt-4 max-w-xl text-xl text-[var(--ink-soft)]">
          Pick a dish. Each step shows the motion, the heat and what done looks like, and the
          timers keep running while you move on.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SEED_RECIPES.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="group flex h-full flex-col rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-3 shadow-[5px_5px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--tomato)]"
              >
                <Stage recipe={recipe} stepIndex={coverStep(recipe)} progress={0.8} />
                <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
                    {recipe.cuisine} · {recipe.difficulty}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">
                    {recipe.title}
                  </h2>
                  <p className="mt-auto pt-3 text-base text-[var(--ink-soft)]">
                    {recipe.prepMinutes + recipe.cookMinutes} min · {recipe.steps.length} steps
                    {recipe.source && ` · ${recipe.source.name}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
