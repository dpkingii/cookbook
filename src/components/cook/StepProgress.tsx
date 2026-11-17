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
              className={`block w-full border-2 border-[var(--ink)] transition-[height,background-color] ${
                n === current ? "h-3.5 bg-white" : completed.includes(n) ? "h-2 bg-[var(--ink)]" : "h-2 bg-transparent"
              }`}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}
