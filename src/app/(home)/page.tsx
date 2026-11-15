import Link from "next/link";
import { Stage } from "@/components/stage";
import { listCuisines, listRecipes } from "@/lib/db/recipes";
import type { Difficulty, Recipe } from "@/lib/recipe/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** The step that best shows the dish: the last one on a burner or in the oven. */
function coverStep(recipe: Recipe) {
  const i = recipe.steps.findLastIndex((s) => s.heat);
  return i === -1 ? recipe.steps.length - 1 : i;
}

type Filters = { cuisine?: string; difficulty?: Difficulty; q?: string };

function hrefFor(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function chipClass(active: boolean) {
  return `rounded-full border-2 border-[var(--ink)] px-4 py-1 text-base font-semibold capitalize transition-colors ${
    active
      ? "bg-[var(--ink)] text-[var(--paper)]"
      : "bg-transparent hover:bg-[var(--paper-deep)]"
  }`;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewerId = null;
  const params = await searchParams;
  const cuisine = first(params.cuisine) || undefined;
  const difficultyParam = first(params.difficulty);
  const difficulty = DIFFICULTIES.find((d) => d === difficultyParam);
  const q = first(params.q)?.trim() || undefined;
  const filters: Filters = { cuisine, difficulty, q };
  const filtered = Boolean(cuisine || difficulty || q);

  const [recipes, cuisines] = await Promise.all([
    listRecipes({ viewerId, scope: "catalogue", cuisine, difficulty, q }),
    listCuisines(),
  ]);

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

        <div className="mt-10 flex flex-col gap-4">
          <form action="/" className="flex max-w-xl gap-2">
            {cuisine && <input type="hidden" name="cuisine" value={cuisine} />}
            {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search recipes or ingredients"
              aria-label="Search recipes or ingredients"
              className="min-w-0 flex-1 rounded-full border-2 border-[var(--ink)] bg-transparent px-5 py-2 text-lg placeholder:text-[var(--ink-soft)]"
            />
            <button
              type="submit"
              className="rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2 text-lg font-bold text-[var(--paper)]"
            >
              Search
            </button>
          </form>
          <nav aria-label="Filter by cuisine" className="flex flex-wrap gap-2">
            <Link href={hrefFor({ ...filters, cuisine: undefined })} className={chipClass(!cuisine)}>
              All cuisines
            </Link>
            {cuisines.map((name) => (
              <Link
                key={name}
                href={hrefFor({ ...filters, cuisine: name })}
                className={chipClass(cuisine === name)}
              >
                {name}
              </Link>
            ))}
          </nav>
          <nav aria-label="Filter by difficulty" className="flex flex-wrap gap-2">
            <Link href={hrefFor({ ...filters, difficulty: undefined })} className={chipClass(!difficulty)}>
              Any difficulty
            </Link>
            {DIFFICULTIES.map((level) => (
              <Link
                key={level}
                href={hrefFor({ ...filters, difficulty: level })}
                className={chipClass(difficulty === level)}
              >
                {level}
              </Link>
            ))}
          </nav>
        </div>

        {recipes.length === 0 && (
          <p className="mt-10 text-xl text-[var(--ink-soft)]">
            No recipes match.{" "}
            {filtered && (
              <Link href="/" className="font-semibold text-[var(--ink)] underline underline-offset-4">
                Clear filters.
              </Link>
            )}
          </p>
        )}

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
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
