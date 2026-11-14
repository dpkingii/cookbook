import type { Recipe } from "@/lib/recipe/types";
import type { PlayerEvent } from "./events";
import { reduce } from "./reducer";
import type { PlayerState } from "./reducer";

export type MakeId = () => string;

export interface CommandContext {
  state: PlayerState;
  recipe: Recipe;
  now: number;
  makeId: MakeId;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Draft = DistributiveOmit<PlayerEvent, "id" | "at">;

/**
 * Commands propose events and then keep only the ones the reducer accepts, so a
 * command can never emit something the reducer would drop.
 */
function emit({ state, now, makeId }: Pick<CommandContext, "state" | "now" | "makeId">, drafts: Draft[]) {
  const out: PlayerEvent[] = [];
  let s = state;
  for (const draft of drafts) {
    const event = { ...draft, id: makeId(), at: now } as PlayerEvent;
    const next = reduce(s, event);
    if (next !== s) {
      out.push(event);
      s = next;
    }
  }
  return out;
}

export const start = (ctx: CommandContext) => emit(ctx, [{ type: "session_started" }]);

export const toggleMise = (ctx: CommandContext, ingredientId: string) =>
  emit(ctx, [{ type: "mise_checked", ingredientId, checked: !ctx.state.checked.includes(ingredientId) }]);

export const beginCooking = (ctx: CommandContext) => emit(ctx, [{ type: "cooking_started" }]);

export const next = (ctx: CommandContext) => {
  const i = ctx.state.currentStep;
  return emit(ctx, [
    { type: "step_completed", stepIndex: i },
    { type: "step_entered", stepIndex: i + 1 },
  ]);
};

export const back = (ctx: CommandContext) =>
  emit(ctx, [{ type: "step_entered", stepIndex: ctx.state.currentStep - 1 }]);

export const goTo = (ctx: CommandContext, stepIndex: number) =>
  emit(ctx, [{ type: "step_entered", stepIndex }]);

export const startStepTimer = (ctx: CommandContext) => {
  const stepIndex = ctx.state.currentStep;
  const timer = ctx.recipe.steps[stepIndex]?.timer;
  if (!timer) return [];
  return emit(ctx, [
    {
      type: "timer_started",
      timerId: ctx.makeId(),
      stepIndex,
      endsAt: ctx.now + timer.seconds * 1000,
      seconds: timer.seconds,
      label: timer.label,
      mode: timer.mode,
    },
  ]);
};

export const cancelTimer = (ctx: CommandContext, timerId: string) =>
  emit(ctx, [{ type: "timer_cancelled", timerId }]);

export const acknowledgeTimer = (ctx: CommandContext, timerId: string) =>
  emit(ctx, [{ type: "timer_acknowledged", timerId }]);

export const pause = (ctx: CommandContext) => emit(ctx, [{ type: "session_paused" }]);

export const resume = (ctx: CommandContext) => emit(ctx, [{ type: "session_resumed" }]);

export const finish = (ctx: CommandContext, { rating, note }: { rating?: number; note?: string }) =>
  emit(ctx, [
    {
      type: "session_finished",
      ...(rating === undefined ? {} : { rating }),
      ...(note === undefined ? {} : { note }),
    },
  ]);

export function tick(state: PlayerState, now: number, makeId: MakeId): PlayerEvent[] {
  if (state.paused) return [];
  const due = state.timers
    .filter((t) => t.status === "running" && t.endsAt <= now)
    .sort((a, b) => a.endsAt - b.endsAt);
  return emit(
    { state, now, makeId },
    due.map((t) => ({ type: "timer_finished", timerId: t.id })),
  );
}
