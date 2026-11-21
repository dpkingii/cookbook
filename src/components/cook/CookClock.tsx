import { elapsedMs, type PlayerState } from "@/lib/player";
import type { Recipe } from "@/lib/recipe/types";
import { formatElapsed } from "./format";

/**
 * Time spent cooking against the recipe's own estimate, in the header.
 * Pauses don't count. Going over is stated plainly, never as a warning: a beginner is
 * expected to take longer than the recipe says.
 */
export function CookClock({ recipe, state, now }: { recipe: Recipe; state: PlayerState; now: number }) {
  const estimate = recipe.prepMinutes + recipe.cookMinutes;
  const ms = elapsedMs(state, now);
  const minutes = Math.floor(ms / 60_000);
  const over = estimate > 0 && minutes >= estimate;
  const share = estimate > 0 ? Math.min(1, ms / (estimate * 60_000)) : 0;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <p className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
        <span className="sr-only">Cooking for </span>
        <span className="font-serif text-xl font-medium leading-none">{formatElapsed(ms)}</span>
        {estimate > 0 && (
          <span className="text-sm text-[var(--mute)]">
            <span aria-hidden>/ </span>
            <span className="sr-only">. The recipe estimates </span>
            {estimate} min
            {over && <span className="sr-only">, and you are past it</span>}
          </span>
        )}
      </p>
      {estimate > 0 && (
        <span aria-hidden className="block h-1 w-full min-w-16 border border-[var(--ink)]">
          <span className="block h-full bg-[var(--ink)]" style={{ width: `${share * 100}%` }} />
        </span>
      )}
    </div>
  );
}
