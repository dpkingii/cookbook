import {
  acknowledgeTimer,
  beginCooking,
  finish,
  initialState,
  next,
  reduce,
  start,
  startStepTimer,
  tick,
  toggleMise,
  type CommandContext,
  type PlayerEvent,
} from "@/lib/player";
import type { Recipe } from "@/lib/recipe/types";

/**
 * Plays a recipe through the real player commands on a fake clock. `walkthrough`
 * taps straight through without waiting for any timer.
 */
export function simulateCook(
  recipe: Recipe,
  startAt: number,
  opts: { makeId: () => string; walkthrough?: boolean; rating?: number; note?: string },
): PlayerEvent[] {
  const { makeId, walkthrough = false } = opts;
  const events: PlayerEvent[] = [];
  let state = initialState(recipe);
  let now = startAt;

  const run = (command: (ctx: CommandContext) => PlayerEvent[]) => {
    const out = command({ state, recipe, now, makeId });
    state = reduce(state, out);
    events.push(...out);
  };
  const wait = (ms: number) => {
    now += walkthrough ? 1000 : ms;
  };

  run(start);
  for (const ingredient of recipe.ingredients) {
    wait(3000);
    run((ctx) => toggleMise(ctx, ingredient.id));
  }
  wait(2000);
  run(beginCooking);

  recipe.steps.forEach((step) => {
    wait(25_000);
    if (step.timer && !walkthrough) {
      run(startStepTimer);
      now += step.timer.seconds * 1000;
      const due = tick(state, now, makeId);
      state = reduce(state, due);
      events.push(...due);
      for (const timer of state.timers.filter((t) => t.status === "ringing")) {
        run((ctx) => acknowledgeTimer(ctx, timer.id));
      }
    }
    run(next);
  });

  wait(10_000);
  run((ctx) => finish(ctx, { rating: opts.rating, note: opts.note }));
  return events;
}
