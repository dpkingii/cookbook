"use client";

import type { Recipe } from "@/lib/recipe/types";
import { dockTimers, remainingMs, ringingTimers, type PlayerState } from "@/lib/player";
import { focusRing, wideColumn } from "./focus";
import { formatClock } from "./format";

export function TimerDock({
  recipe,
  state,
  now,
  onAcknowledge,
}: {
  recipe: Recipe;
  state: PlayerState;
  now: number;
  onAcknowledge: (timerId: string) => void;
}) {
  const ringing = ringingTimers(state);
  const running = dockTimers(state).filter((t) => t.status === "running");
  if (ringing.length === 0 && running.length === 0) return null;

  return (
    <aside aria-label="Timers" className="border-t border-[var(--rule)] bg-white">
      <ul className={`mx-auto w-full max-w-xl divide-y divide-[var(--rule)] px-5 ${wideColumn}`}>
        {ringing.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onAcknowledge(t.id)}
              className={`my-2 flex min-h-14 w-full items-center justify-between gap-3 border-l-4 border-[var(--accent)] pl-3 text-left ${focusRing}`}
            >
              <span>
                <span className="label-caps block !text-[var(--accent)]">Ready · Step {t.stepIndex + 1}</span>
                <span className="block font-serif text-xl font-medium leading-tight">{t.label} is ready</span>
                <span className="block text-base text-[var(--mute)]">
                  {recipe.steps[t.stepIndex].cue ?? "Check it now."}
                </span>
              </span>
              <span className="shrink-0 border border-[var(--ink)] px-4 py-2 text-base font-medium">Got it</span>
            </button>
          </li>
        ))}
        {running.map((t) => (
          <li key={t.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
            <span className="text-base">{t.label}</span>
            <span className="font-serif text-2xl font-medium tabular-nums">
              {formatClock(remainingMs(t, now))}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
