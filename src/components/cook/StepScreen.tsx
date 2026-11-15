"use client";

import type { Recipe } from "@/lib/recipe/types";
import {
  cancelTimer,
  goTo,
  hasUnfinishedStayTimer,
  remainingMs,
  startStepTimer,
  stepProgress,
  timerForStep,
  type CommandContext,
  type PlayerEvent,
  type PlayerState,
} from "@/lib/player";
import { IngredientToken, Stage } from "@/components/stage";
import { describeUse, formatClock, formatDuration } from "./format";

type Run = (command: (ctx: CommandContext) => PlayerEvent[]) => void;

export function StepScreen({
  recipe,
  state,
  now,
  run,
  onNext,
  onBack,
}: {
  recipe: Recipe;
  state: PlayerState;
  now: number;
  run: Run;
  onNext: () => void;
  onBack: () => void;
}) {
  const i = state.currentStep;
  const step = recipe.steps[i];
  const timer = timerForStep(state, i);
  const running = timer?.status === "running";
  const rang = timer?.status === "ringing" || timer?.status === "done";
  const waiting = hasUnfinishedStayTimer(state);
  const last = i === recipe.steps.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <ol className="mt-3 flex gap-1" aria-label="Steps">
        {recipe.steps.map((s, n) => (
          <li key={n} className="flex-1">
            <button
              type="button"
              aria-label={`Step ${n + 1}: ${s.text}`}
              aria-current={n === i ? "step" : undefined}
              onClick={() => run((ctx) => goTo(ctx, n))}
              className="block h-6 w-full"
            >
              <span
                className={`block h-2 rounded-full transition-colors ${
                  n === i
                    ? "bg-[var(--tomato)]"
                    : state.completed.includes(n)
                      ? "bg-[var(--ink)]"
                      : "bg-[var(--paper-deep)]"
                }`}
              />
            </button>
          </li>
        ))}
      </ol>

      <div className="relative">
        <Stage recipe={recipe} stepIndex={i} progress={stepProgress(state, recipe, now)} />
        <button
          type="button"
          aria-label="Previous step"
          onClick={onBack}
          disabled={i === 0}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          aria-label={last ? "Finish" : "Next step"}
          onClick={onNext}
          className="absolute inset-y-0 right-0 w-2/3"
        />
        {state.paused && (
          <div className="absolute inset-0 grid place-items-center bg-[var(--paper)]/85">
            <p className="font-serif text-4xl font-semibold">Paused</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
        Step {i + 1} of {recipe.steps.length} · {step.technique}
        {step.heat && ` · ${step.heat} heat`}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
        {step.text}
      </h1>

      {step.uses.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {step.uses.map((use) => {
            const ingredient = recipe.ingredients.find((x) => x.id === use.ingredientId);
            if (!ingredient) return null;
            const { amount, name, note } = describeUse(use, ingredient);
            return (
              <li
                key={use.ingredientId}
                className="flex items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-deep)] py-1 pl-1 pr-4 text-lg"
              >
                <IngredientToken ingredient={ingredient} size={32} />
                <span>
                  {amount && <strong>{amount} </strong>}
                  {name}
                  {note && <span className="text-[var(--ink-soft)]"> ({note})</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {step.cue && (
        <p className="mt-3 border-l-4 border-[var(--gold)] pl-3 text-xl">
          <span className="font-semibold">Done when: </span>
          {step.cue}
        </p>
      )}

      {step.timer && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {running && timer ? (
            <>
              <span
                className="font-mono text-5xl font-bold tabular-nums"
                role="timer"
                aria-label={`${step.timer.label} time left`}
              >
                {formatClock(remainingMs(timer, now))}
              </span>
              <button
                type="button"
                onClick={() => run((ctx) => cancelTimer(ctx, timer.id))}
                className="rounded-full border-2 border-[var(--ink)] px-4 py-2 font-semibold"
              >
                Cancel timer
              </button>
              {step.timer.mode === "background" && (
                <span className="text-lg text-[var(--ink-soft)]">
                  Keeps running. Move on.
                </span>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => run(startStepTimer)}
              className="rounded-full border-2 border-[var(--ink)] bg-[var(--gold)] px-6 py-3 text-xl font-bold shadow-[3px_3px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              {rang ? "Run it again" : "Start timer"} · {formatDuration(step.timer.seconds)}
            </button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-auto flex gap-3 bg-[var(--paper)] px-4 pb-4 pt-4 sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          disabled={i === 0 || state.paused}
          className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-6 py-4 text-xl font-bold disabled:opacity-30"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={state.paused}
          className={`flex-1 rounded-full border-2 border-[var(--ink)] py-4 text-xl font-bold shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 ${
            waiting
              ? "bg-[var(--paper-deep)] text-[var(--ink)]"
              : "bg-[var(--tomato)] text-[var(--paper)]"
          }`}
        >
          {waiting ? "Skip ahead anyway" : last ? "Done cooking" : "Next"}
        </button>
      </div>
    </div>
  );
}
