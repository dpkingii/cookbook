import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { primaryButton } from "@/components/editor/ui";
import { getViewer } from "@/lib/auth/viewer";
import { listRecipes, type StoredRecipe } from "@/lib/db/recipes";
import { Pager, paginate } from "@/components/site/Pager";
import { RecipeCard } from "./RecipeCard";

export const metadata = { title: "My recipes" };

function Empty({ title, children, href, action }: { title: string; children: string; href: string; action: string }) {
  return (
    <div className="mt-4 max-w-xl rounded-3xl border-2 border-dashed border-[var(--ink)] p-6">
      <p className="font-serif text-2xl font-semibold">{title}</p>
      <p className="mt-2 text-lg text-[var(--ink-soft)]">{children}</p>
      <Link href={href} className="mt-4 inline-block min-h-11 py-2 text-lg font-semibold underline underline-offset-4">
        {action}
      </Link>
    </div>
  );
}

function Grid({ recipes, showVisibility }: { recipes: StoredRecipe[]; showVisibility?: boolean }) {
  return (
    <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} showVisibility={showVisibility} />
        </li>
      ))}
    </ul>
  );
}

export default async function MyRecipesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await getViewer();
  const member = viewer && !viewer.isGuest ? viewer : null;
  const [mine, favorites] = member
    ? await Promise.all([
        listRecipes({ viewerId: member.id, scope: "mine" }),
        listRecipes({ viewerId: member.id, scope: "favorites" }),
      ])
    : [[], []];
  const shown = paginate(mine, (await searchParams).page);

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-5xl font-semibold leading-[1.05]">My recipes</h1>
          {member && (
            <Link href="/recipes/new" className={primaryButton}>
              New recipe
            </Link>
          )}
        </div>

        {!member ? (
          <div className="mt-8 max-w-xl rounded-3xl border-2 border-dashed border-[var(--ink)] p-6 sm:p-8">
            <h2 className="font-serif text-3xl font-semibold leading-tight">Log in to keep your own recipes</h2>
            <p className="mt-3 text-xl text-[var(--ink-soft)]">
              Paste a recipe or a link, fix the steps, and cook it like any other. You need an account to save it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className={primaryButton}>
                Log in
              </Link>
              <Link href="/signup" className="inline-flex min-h-11 items-center px-3 text-lg font-semibold underline underline-offset-4">
                Create an account
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section aria-labelledby="mine-heading" className="mt-10">
              <h2 id="mine-heading" className="font-serif text-3xl font-semibold">
                Your recipes
              </h2>
              {mine.length ? (
                <>
                  <Grid recipes={shown.items} showVisibility />
                  <Pager page={shown.page} pages={shown.pages} params={{}} />
                </>
              ) : (
                <Empty title="Nothing here yet." href="/recipes/new" action="Paste a recipe">
                  Paste a recipe to turn it into a cook-along.
                </Empty>
              )}
            </section>
            <section aria-labelledby="favorites-heading" className="mt-14">
              <h2 id="favorites-heading" className="font-serif text-3xl font-semibold">
                Favourites
              </h2>
              {favorites.length ? (
                <Grid recipes={favorites} />
              ) : (
                <Empty title="No favourites yet." href="/" action="Browse recipes">
                  Tap Favourite on any recipe page and it will wait for you here.
                </Empty>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
