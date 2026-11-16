"use client";

import type { Recipe } from "@/lib/recipe/types";
import { IngredientToken } from "@/components/stage";
import { buttonPrimary } from "@/components/ui/styles";
import { focusRing } from "./focus";
import { Footer } from "./Footer";
import { formatAmount } from "./format";

export function MiseScreen({
  recipe,
  checked,
  onToggle,
  onStart,
}: {
  recipe: Recipe;
  checked: readonly string[];
  onToggle: (ingredientId: string) => void;
  onStart: () => void;
}) {
  const remaining = recipe.ingredients.length - checked.length;

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">
          Mise en place · {checked.length} of {recipe.ingredients.length} out
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-4xl">
          Get everything out first.
        </h1>
        <p className="mt-3 text-base text-[var(--mute)]">Tap each ingredient as it lands on the counter.</p>

        <ul className="mt-6 border-b border-[var(--rule)]">
          {recipe.ingredients.map((ingredient) => {
            const on = checked.includes(ingredient.id);
            const amount = formatAmount(ingredient);
            return (
              <li key={ingredient.id} className="border-t border-[var(--rule)]">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(ingredient.id)}
                  className={`flex min-h-16 w-full items-center gap-3 py-2 text-left ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center border ${
                      on ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--rule)] bg-white"
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="white" strokeWidth="2">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 transition-[filter,opacity] duration-200 ${on ? "" : "opacity-50 grayscale"}`}
                  >
                    <IngredientToken ingredient={ingredient} size={40} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-medium leading-tight">{ingredient.name}</span>
                    {ingredient.note && (
                      <span className="block text-base leading-tight text-[var(--mute)]">{ingredient.note}</span>
                    )}
                  </span>
                  {amount && <span className="shrink-0 text-base tabular-nums text-[var(--mute)]">{amount}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Footer>
        <button type="button" onClick={onStart} className={`${buttonPrimary} w-full`}>
          {remaining === 0 ? "Start cooking" : `Start cooking (${remaining} still to find)`}
        </button>
      </Footer>
    </>
  );
}
