"use client";

import type { Recipe } from "@/lib/recipe/types";
import { IngredientToken } from "@/components/stage";
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
    <div className="flex flex-1 flex-col pt-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
        Mise en place
      </p>
      <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
        Get everything out first.
      </h1>
      <p className="mt-2 text-lg text-[var(--ink-soft)]">
        Tap each ingredient as it lands on the counter.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recipe.ingredients.map((ingredient) => {
          const on = checked.includes(ingredient.id);
          return (
            <li key={ingredient.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(ingredient.id)}
                className={`flex h-full w-full flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition-all duration-200 ${
                  on
                    ? "border-[var(--ink)] bg-[var(--paper-deep)] shadow-[3px_3px_0_var(--tomato)]"
                    : "border-dashed border-[var(--ink-soft)] opacity-70"
                }`}
              >
                <span
                  className={`transition-transform duration-300 ${on ? "scale-100" : "scale-75 grayscale"}`}
                >
                  <IngredientToken ingredient={ingredient} size={64} />
                </span>
                <span className="text-lg font-semibold leading-tight">
                  {formatAmount(ingredient)} {ingredient.name}
                </span>
                {ingredient.note && (
                  <span className="text-sm text-[var(--ink-soft)]">{ingredient.note}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-4 mt-auto pt-6">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] py-4 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {remaining === 0 ? "Start cooking" : `Start cooking (${remaining} still to find)`}
        </button>
      </div>
    </div>
  );
}
