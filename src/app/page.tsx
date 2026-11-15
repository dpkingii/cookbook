import Link from "next/link";
import { IngredientToken } from "@/components/stage";
import { HeroStage } from "@/components/cook/HeroStage";
import { formatAmount } from "@/components/cook/format";
import { DEMO_RECIPE as recipe } from "@/lib/recipe/demo";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
            Cookbook · {recipe.cuisine} · {recipe.difficulty}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">
            {recipe.title}
          </h1>
          <p className="mt-4 text-xl text-[var(--ink-soft)]">{recipe.description}</p>

          <dl className="mt-6 flex gap-6 text-lg">
            {[
              ["Prep", `${recipe.prepMinutes} min`],
              ["Cook", `${recipe.cookMinutes} min`],
              ["Serves", recipe.servings],
              ["Steps", recipe.steps.length],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-sm uppercase tracking-widest text-[var(--ink-soft)]">{term}</dt>
                <dd className="font-serif text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/cook"
            className="mt-8 inline-block rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-10 py-4 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Cook this
          </Link>
        </div>

        <HeroStage recipe={recipe} />

        <section className="md:col-span-2">
          <h2 className="font-serif text-2xl font-semibold">You&rsquo;ll need</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recipe.ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-center gap-2 rounded-full border-2 border-[var(--ink)] py-1 pl-1 pr-4 text-lg"
              >
                <IngredientToken ingredient={ingredient} size={32} />
                <span>
                  <strong>{formatAmount(ingredient)}</strong> {ingredient.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
