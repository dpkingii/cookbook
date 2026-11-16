import type { Recipe } from "@/lib/recipe/types";
import { focusRing } from "./focus";

export function StepProgress({
  recipe,
  current,
  completed,
  onGoTo,
}: {
  recipe: Recipe;
  current: number;
  completed: readonly number[];
  onGoTo: (step: number) => void;
}) {
  return (
    <ol className="flex gap-1" aria-label="Steps">
      {recipe.steps.map((s, n) => (
        <li key={n} className="flex-1">
          <button
            type="button"
            aria-label={`Step ${n + 1}: ${s.text}`}
            aria-current={n === current ? "step" : undefined}
            onClick={() => onGoTo(n)}
            className={`flex h-11 w-full items-center ${focusRing}`}
          >
            <span
              className={`block h-[3px] w-full transition-colors ${
                n === current ? "bg-[var(--accent)]" : completed.includes(n) ? "bg-[var(--ink)]" : "bg-[var(--rule)]"
              }`}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}
