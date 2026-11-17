import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { ring } from "@/components/site/focus";
import { Pager } from "@/components/site/Pager";
import { RecipeList } from "@/components/site/RecipeList";
import { SearchField } from "@/components/site/SearchField";
import { getViewer } from "@/lib/auth/viewer";
import {
  listFavouriteRows,
  listInProgress,
  listRecentlyCooked,
  listRecipePage,
  type InProgress,
} from "@/lib/db/browse";

export const metadata = { title: "Cook" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="label-caps mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Resume({ items }: { items: InProgress[] }) {
  return (
    <ul className="border-b border-[var(--rule)]">
      {items.map((s) => (
        <li key={s.recipeId} className="border-t border-[var(--rule)]">
          <Link href={`/cook/${s.recipeId}`} className={`group flex min-h-16 flex-col justify-center py-3 ${ring}`}>
            <span className="font-serif text-xl font-medium leading-snug group-hover:underline group-hover:decoration-[var(--rule)] group-hover:underline-offset-4">
              {s.title}
            </span>
            <span className="mt-0.5 text-sm text-[var(--mute)]">
              Step {s.step} of {s.steps} · <span className="font-medium text-[var(--ink)]">resume</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Results({ viewerId, q, page }: { viewerId: string | null; q: string; page?: string }) {
  const { rows, total, pages, page: current } = await listRecipePage({ viewerId, q, page });
  return (
    <Section id="results" title={`Results · ${total}`}>
      {rows.length === 0 ? (
        <p className="border-t border-[var(--rule)] pt-4 text-base text-[var(--mute)]">
          Nothing matched &ldquo;{q}&rdquo;. Search looks at recipe names and ingredients, so try an ingredient such as
          garlic or tofu.
        </p>
      ) : (
        <>
          <RecipeList rows={rows} />
          <Pager page={current} pages={pages} params={{ q }} />
        </>
      )}
    </Section>
  );
}

async function Ready({ viewerId }: { viewerId: string | null }) {
  const [progress, recent, favourites] = viewerId
    ? await Promise.all([listInProgress(viewerId), listRecentlyCooked(viewerId, 5), listFavouriteRows(viewerId, 5)])
    : [[], [], []];

  if (progress.length + recent.length + favourites.length === 0) {
    return (
      <p className="mt-10 max-w-sm border-t border-[var(--rule)] pt-4 text-base text-[var(--mute)]">
        Nothing to pick up yet. Choose a recipe on{" "}
        <Link href="/" className={`font-medium text-[var(--ink)] underline underline-offset-4 ${ring}`}>
          Home
        </Link>
        , or search above.
      </p>
    );
  }

  return (
    <>
      {progress.length > 0 && (
        <Section id="progress" title="In progress">
          <Resume items={progress} />
        </Section>
      )}
      {recent.length > 0 && (
        <Section id="recent" title="Cooked recently">
          <RecipeList rows={recent} />
        </Section>
      )}
      {favourites.length > 0 && (
        <Section id="favourites" title="Favourites">
          <RecipeList rows={favourites} />
        </Section>
      )}
    </>
  );
}

export default async function CookPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const viewerId = (await getViewer())?.id ?? null;
  const { q: raw, page } = await searchParams;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() || undefined;

  return (
    <AppShell tone="tomato">
      <p className="label-caps">Cook</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">What are you making?</h1>
      <div className="mt-6 max-w-xl">
        <SearchField defaultValue={q} />
      </div>
      {q ? <Results viewerId={viewerId} q={q} page={page} /> : <Ready viewerId={viewerId} />}
    </AppShell>
  );
}
