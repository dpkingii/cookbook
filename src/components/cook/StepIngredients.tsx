import type { Recipe, Step } from "@/lib/recipe/types";
import { IngredientToken } from "@/components/stage";
import { describeUse } from "./format";

export function StepIngredients({ recipe, uses }: { recipe: Recipe; uses: Step["uses"] }) {
  if (uses.length === 0) return null;
  return (
    <ul className="mt-5 border-b border-[var(--rule)]">
      {uses.map((use) => {
        const ingredient = recipe.ingredients.find((x) => x.id === use.ingredientId);
        if (!ingredient) return null;
        const { amount, name, note } = describeUse(use, ingredient);
        return (
          <li
            key={use.ingredientId}
            className="flex min-h-12 items-center gap-3 border-t border-[var(--rule)] py-2"
          >
            <span aria-hidden className="shrink-0">
              <IngredientToken ingredient={ingredient} size={32} />
            </span>
            <span className="min-w-0 flex-1 text-lg leading-tight">
              {name}
              {note && <span className="text-[var(--mute)]"> ({note})</span>}
            </span>
            {amount && <span className="shrink-0 text-lg tabular-nums text-[var(--mute)]">{amount}</span>}
          </li>
        );
      })}
    </ul>
  );
}
