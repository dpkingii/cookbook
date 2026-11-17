import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroStage } from "@/components/cook/HeroStage";
import { formatAmount } from "@/components/cook/format";
import { DeleteRecipe } from "@/components/editor/DeleteRecipe";
import { FavoriteButton } from "@/components/editor/FavoriteButton";
import { AppShell } from "@/components/site/AppShell";
import { IngredientToken } from "@/components/stage";
import { buttonGhost, buttonPrimary, textLink } from "@/components/ui/styles";
import { getViewer } from "@/lib/auth/viewer";
import { getRecipe } from "@/lib/db/recipes";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">) {
  const viewerId = (await getViewer())?.id ?? null;
  return { title: (await getRecipe((await params).id, viewerId))?.title };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const viewer = await getViewer();
  const recipe = await getRecipe((await params).id, viewer?.id ?? null);
  if (!recipe) notFound();
  const isOwner = Boolean(viewer && recipe.ownerId === viewer.id);
  const isMember = Boolean(viewer && !viewer.isGuest);

  const facts = [
    ["Prep", `${recipe.prepMinutes} min`],
    ["Cook", `${recipe.cookMinutes} min`],
    ["Serves", String(recipe.servings)],
    ["Steps", String(recipe.steps.length)],
  ];

  return (
    <AppShell tone="pink">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-14">
        <div>
          <p className="label-caps">
            {recipe.cuisine} · {recipe.difficulty}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl xl:text-5xl xl:leading-[1.05]">
            {recipe.title}
          </h1>
          {recipe.description && <p className="mt-3 text-base text-[var(--mute)]">{recipe.description}</p>}
          {recipe.source && (
            <p className="mt-2 text-sm text-[var(--mute)]">
              Adapted from{" "}
              <a href={recipe.source.url} className={textLink} rel="noreferrer">
                {recipe.source.name}
              </a>
            </p>
          )}

          <dl className="sheet mt-6 grid grid-cols-4 px-4 py-4">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt className="label-caps">{term}</dt>
                <dd className="mt-1 whitespace-nowrap font-serif text-2xl font-medium tabular-nums lg:text-xl xl:text-2xl">{value}</dd>
              </div>
            ))}
          </dl>

          <Link href={`/cook/${recipe.id}`} className={`${buttonPrimary} mt-6 w-full`}>
            Cook this
          </Link>

          {(isMember || isOwner) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {isMember && <FavoriteButton recipeId={recipe.id} initial={recipe.favorited} />}
              {isOwner && (
                <>
                  <Link href={`/recipes/${recipe.id}/edit`} className={buttonGhost}>
                    Edit
                  </Link>
                  <DeleteRecipe recipeId={recipe.id} title={recipe.title} />
                </>
              )}
            </div>
          )}
          {isOwner && !recipe.isPublic && (
            <p className="mt-3 text-sm text-[var(--mute)]">Private: only you can see this recipe.</p>
          )}

          <div className="mt-8 lg:hidden">
            <HeroStage recipe={recipe} />
          </div>

          <section aria-labelledby="need" className="mt-10">
            <h2 id="need" className="label-caps mb-2">
              You&rsquo;ll need
            </h2>
            <ul className="sheet px-4 [&>li:first-child]:border-t-0">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex min-h-12 items-center gap-3 border-t border-[var(--rule)] py-2">
                  <IngredientToken ingredient={ingredient} size={28} />
                  <span className="min-w-0 flex-1 text-base">
                    {ingredient.name}
                    {ingredient.note && <span className="text-[var(--mute)]">, {ingredient.note}</span>}
                  </span>
                  <span className="shrink-0 text-base font-medium tabular-nums">{formatAmount(ingredient)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="sticky top-10 hidden lg:block">
          <HeroStage recipe={recipe} />
        </div>
      </div>
    </AppShell>
  );
}
