import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { ring } from "@/components/site/focus";
import { Pager } from "@/components/site/Pager";
import { RecipeList } from "@/components/site/RecipeList";
import { plural } from "@/components/stats/format";
import { Stage } from "@/components/stage";
import { getViewer } from "@/lib/auth/viewer";
import { listCuisineNames, listRecipePage } from "@/lib/db/browse";
import type { Difficulty, Recipe } from "@/lib/recipe/types";
import { listSessions, toFinished } from "@/lib/sessions/queries";
import { weeklyStreak } from "@/lib/stats";
import { suggestNext } from "./suggest";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** The step that best shows the dish: the last one on a burner or in the oven. */
function coverStep(recipe: Recipe) {
  const i = recipe.steps.findLastIndex((s) => s.heat);
  return i === -1 ? recipe.steps.length - 1 : i;
}

type Filters = { cuisine?: string; difficulty?: Difficulty };

function hrefFor(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function FilterRow({
  label,
  options,
  current,
  hrefOf,
}: {
  label: string;
  options: { name: string | undefined; text: string }[];
  current: string | undefined;
  hrefOf: (name: string | undefined) => string;
}) {
  return (
    <nav aria-label={label} className="-mx-2 flex flex-wrap">
      {options.map(({ name, text }) => {
        const on = name === current;
        return (
          <Link
            key={text}
            href={hrefOf(name)}
            aria-current={on ? "true" : undefined}
            className={`inline-flex min-h-11 items-center px-2 text-base ${ring} ${
              on
                ? "font-semibold text-[var(--ink)] underline decoration-[var(--ink)] decoration-2 underline-offset-8"
                : "text-[var(--mute)] hover:text-[var(--ink)]"
            }`}
          >
            {text}
          </Link>
        );
      })}
    </nav>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  const viewerId = viewer?.id ?? null;
  const params = await searchParams;
  const cuisine = first(params.cuisine) || undefined;
  const difficulty = DIFFICULTIES.find((d) => d === first(params.difficulty));
  const filters: Filters = { cuisine, difficulty };
  const filtered = Boolean(cuisine || difficulty);

  const [list, cuisines, entries] = await Promise.all([
    listRecipePage({ viewerId, cuisine, difficulty, page: first(params.page) }),
    listCuisineNames(),
    viewerId ? listSessions(viewerId) : [],
  ]);
  const finished = entries.map(toFinished).filter((s) => s !== null);
  const streak = weeklyStreak(finished, new Date()).current;
  const next = filtered || list.page > 1 ? null : await suggestNext(viewerId, finished);

  return (
    <AppShell>
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl font-medium tracking-[-0.02em]">Cookbook</h1>
        {streak > 0 && <p className="label-caps">Streak · {plural(streak, "week")}</p>}
      </header>

      {next && (
        <section aria-labelledby="next" className="mt-8">
          <h2 id="next" className="label-caps">
            Next to learn
          </h2>
          <Link href={`/recipes/${next.recipe.id}`} className={`group mt-3 block ${ring}`}>
            <div className="border border-[var(--rule)]">
              <Stage recipe={next.recipe} stepIndex={coverStep(next.recipe)} progress={0.8} />
            </div>
            <p className="label-caps mt-4 !text-[var(--accent)]">Teaches {next.teaches}</p>
            <p className="mt-1 font-serif text-2xl font-medium tracking-[-0.01em] group-hover:underline group-hover:decoration-[var(--rule)] group-hover:underline-offset-4">
              {next.recipe.title}
            </p>
            <p className="mt-1 text-sm text-[var(--mute)]">
              {next.recipe.cuisine} · {next.recipe.difficulty} · {next.recipe.prepMinutes + next.recipe.cookMinutes} min ·{" "}
              {plural(next.recipe.steps.length, "step")}
            </p>
          </Link>
        </section>
      )}

      <section aria-labelledby="all" className="mt-10">
        <h2 id="all" className="label-caps">
          All recipes · {list.total}
        </h2>
        <div className="mt-2">
          <FilterRow
            label="Filter by cuisine"
            current={cuisine}
            hrefOf={(name) => hrefFor({ ...filters, cuisine: name })}
            options={[{ name: undefined, text: "All cuisines" }, ...cuisines.map((name) => ({ name, text: name }))]}
          />
          <FilterRow
            label="Filter by difficulty"
            current={difficulty}
            hrefOf={(name) => hrefFor({ ...filters, difficulty: name as Difficulty | undefined })}
            options={[{ name: undefined, text: "Any difficulty" }, ...DIFFICULTIES.map((d) => ({ name: d, text: d[0].toUpperCase() + d.slice(1) }))]}
          />
        </div>

        {list.rows.length === 0 ? (
          <p className="mt-6 border-t border-[var(--rule)] pt-4 text-base text-[var(--mute)]">
            No recipes match.{" "}
            {filtered && (
              <Link href="/" className="font-medium text-[var(--ink)] underline underline-offset-4">
                Clear filters
              </Link>
            )}
          </p>
        ) : (
          <div className="mt-4">
            <RecipeList rows={list.rows} />
          </div>
        )}
        <Pager page={list.page} pages={list.pages} params={filters} />
      </section>
    </AppShell>
  );
}
