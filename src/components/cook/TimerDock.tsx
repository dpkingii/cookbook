"use client";

import type { Recipe } from "@/lib/recipe/types";
import { dockTimers, remainingMs, ringingTimers, type PlayerState } from "@/lib/player";
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
    <aside
      aria-label="Timers"
      className="sticky bottom-0 border-t-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-[var(--paper)] sm:px-6"
    >
      <ul className="mx-auto flex max-w-3xl flex-wrap gap-2">
        {ringing.map((t) => (
          <li key={t.id} className="w-full">
            <button
              type="button"
              onClick={() => onAcknowledge(t.id)}
              className="flex w-full animate-pulse items-center justify-between gap-3 rounded-2xl bg-[var(--tomato)] px-4 py-3 text-left text-xl font-bold"
            >
              <span>
                {t.label} is ready
                <span className="block text-base font-normal">
                  Step {t.stepIndex + 1}: {recipe.steps[t.stepIndex].cue ?? "check it now"}
                </span>
              </span>
              <span className="rounded-full border-2 border-[var(--paper)] px-4 py-1 text-base">
                Got it
              </span>
            </button>
          </li>
        ))}
        {running.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-full border-2 border-[var(--paper)]/40 px-4 py-1.5"
          >
            <span className="text-base">{t.label}</span>
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatClock(remainingMs(t, now))}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
