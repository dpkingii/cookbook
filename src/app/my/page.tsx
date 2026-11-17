import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { BackLink } from "@/components/site/BackLink";
import { Pager } from "@/components/site/Pager";
import { RecipeList } from "@/components/site/RecipeList";
import { buttonGhost, buttonPrimary, textLink } from "@/components/ui/styles";
import { getViewer } from "@/lib/auth/viewer";
import { listFavouriteRows, listRecipePage } from "@/lib/db/browse";

export const metadata = { title: "My recipes" };

function Empty({ href, action, children }: { href: string; action: string; children: string }) {
  return (
    <p className="border-t border-[var(--rule)] pt-4 text-base text-[var(--mute)]">
      {children}{" "}
      <Link href={href} className={`${textLink} text-[var(--ink)]`}>
        {action}
      </Link>
    </p>
  );
}

export default async function MyRecipesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await getViewer();
  const member = viewer && !viewer.isGuest ? viewer : null;
  const [mine, favourites] = member
    ? await Promise.all([
        listRecipePage({ viewerId: member.id, scope: "mine", page: (await searchParams).page }),
        listFavouriteRows(member.id),
      ])
    : [null, []];

  return (
    <AppShell tone="lilac">
      <BackLink />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">My recipes</h1>
        {member && (
          <Link href="/recipes/new" className={buttonPrimary}>
            New recipe
          </Link>
        )}
      </div>

      {!mine ? (
        <section className="mt-8 border-t border-[var(--rule)] pt-6">
          <h2 className="font-serif text-2xl font-medium">Log in to keep your own recipes</h2>
          <p className="mt-2 max-w-md text-base text-[var(--mute)]">
            Paste a recipe or a link, fix the steps, and cook it like any other. You need an account to save it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login" className={buttonPrimary}>
              Log in
            </Link>
            <Link href="/signup" className={buttonGhost}>
              Create an account
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="mine-heading" className="mt-8">
            <h2 id="mine-heading" className="label-caps mb-2">
              Your recipes · {mine.total}
            </h2>
            {mine.rows.length ? (
              <>
                <RecipeList rows={mine.rows} showVisibility />
                <Pager page={mine.page} pages={mine.pages} params={{}} />
              </>
            ) : (
              <Empty href="/recipes/new" action="Paste a recipe">
                Nothing here yet. Paste a recipe to turn it into a cook-along.
              </Empty>
            )}
          </section>
          <section aria-labelledby="favourites-heading" className="mt-10">
            <h2 id="favourites-heading" className="label-caps mb-2">
              Favourites · {favourites.length}
            </h2>
            {favourites.length ? (
              <RecipeList rows={favourites} />
            ) : (
              <Empty href="/" action="Browse recipes">
                No favourites yet. Tap Favourite on any recipe page and it will wait for you here.
              </Empty>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
