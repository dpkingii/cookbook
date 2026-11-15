import { initialState, reduce, type PlayerEvent } from "@/lib/player";
import type { Recipe, Technique } from "@/lib/recipe/types";

export interface TimelineStep {
  index: number;
  text: string;
  technique: Technique;
  timerSeconds: number | null;
  spentSeconds: number;
  reached: boolean;
  completed: boolean;
}

export interface TimelineTimer {
  id: string;
  stepIndex: number;
  label: string;
  seconds: number;
  startedOffset: number;
  endedOffset: number | null;
  outcome: "rang" | "cancelled" | "running";
}

export interface Timeline {
  steps: TimelineStep[];
  timers: TimelineTimer[];
  pausedSeconds: number;
  finished: boolean;
}

/** Time is credited to the step on screen, and never while the session is paused. */
export function buildTimeline(recipe: Recipe, events: readonly PlayerEvent[]): Timeline {
  let state = initialState(recipe);
  let last: number | null = null;
  const spent = recipe.steps.map(() => 0);
  const reached = new Set<number>();
  const endedAt = new Map<string, number>();

  for (const event of events) {
    if (last !== null && state.phase === "cooking" && !state.paused) {
      spent[state.currentStep] += Math.max(0, event.at - last);
    }
    const next = reduce(state, event);
    if (next !== state) {
      if (event.type === "timer_finished" || event.type === "timer_cancelled") endedAt.set(event.timerId, event.at);
      if (event.type === "session_finished") {
        for (const t of state.timers) if (t.status === "running" && !endedAt.has(t.id)) endedAt.set(t.id, event.at);
      }
    }
    state = next;
    last = event.at;
    if (state.phase === "cooking") reached.add(state.currentStep);
  }

  const origin = state.startedAt ?? 0;
  return {
    steps: recipe.steps.map((step, index) => ({
      index,
      text: step.text,
      technique: step.technique,
      timerSeconds: step.timer?.seconds ?? null,
      spentSeconds: Math.round(spent[index] / 1000),
      reached: reached.has(index) || state.completed.includes(index),
      completed: state.completed.includes(index),
    })),
    timers: state.timers.map((t) => ({
      id: t.id,
      stepIndex: t.stepIndex,
      label: t.label,
      seconds: t.seconds,
      startedOffset: Math.round((t.startedAt - origin) / 1000),
      endedOffset: endedAt.has(t.id) ? Math.round((endedAt.get(t.id)! - origin) / 1000) : null,
      outcome: t.status === "cancelled" ? "cancelled" : t.status === "running" ? "running" : "rang",
    })),
    pausedSeconds: Math.round(state.pausedMs / 1000),
    finished: state.finishedAt !== null,
  };
}
