"use client";

import type { Recipe } from "@/lib/recipe/types";
import {
  cancelTimer,
  goTo,
  startStepTimer,
  stepProgress,
  timerForStep,
  type CommandContext,
  type PlayerEvent,
  type PlayerState,
} from "@/lib/player";
import { Stage } from "@/components/stage";
import { TechniqueNote } from "@/components/technique/TechniqueNote";
import { buttonGhost } from "@/components/ui/styles";
import { focusRing, wideColumn } from "./focus";
import { formatDuration } from "./format";
import { StepIngredients } from "./StepIngredients";
import { StepProgress } from "./StepProgress";

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
  const last = i === recipe.steps.length - 1;

  return (
    <div className={`mx-auto w-full max-w-xl flex-1 px-5 pb-8 ${wideColumn}`}>
      <StepProgress recipe={recipe} current={i} completed={state.completed} onGoTo={(n) => run((ctx) => goTo(ctx, n))} />

      <div className="lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <div className="sheet relative mt-1 lg:sticky lg:top-6 lg:mt-0">
          <Stage recipe={recipe} stepIndex={i} progress={stepProgress(state, recipe, now)} />
          <button
            type="button"
            aria-label="Previous step"
            onClick={onBack}
            disabled={i === 0}
            className={`absolute inset-y-0 left-0 w-1/3 ${focusRing}`}
          />
          <button
            type="button"
            aria-label={last ? "Finish" : "Next step"}
            onClick={onNext}
            className={`absolute inset-y-0 right-0 w-2/3 ${focusRing}`}
          />
          {state.paused && (
            <div className="absolute inset-0 grid place-items-center bg-white/90">
              <p className="font-serif text-4xl font-medium tracking-[-0.02em]">Paused</p>
            </div>
          )}
        </div>

        <div>
          <div className="label-caps mt-5 lg:mt-1">
            Step {i + 1} of {recipe.steps.length} · <TechniqueNote technique={step.technique} />
            {step.heat && ` · ${step.heat} heat`}
          </div>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-5xl lg:text-4xl xl:text-5xl">
            {step.text}
          </h1>

          <StepIngredients recipe={recipe} uses={step.uses} />

          {step.cue && (
            <div className="mt-5">
              <p className="label-caps">Done when</p>
              <p className="mt-1 text-xl leading-snug">{step.cue}</p>
            </div>
          )}

          {step.timer && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {running && timer ? (
                <>
                  <button type="button" onClick={() => run((ctx) => cancelTimer(ctx, timer.id))} className={buttonGhost}>
                    Cancel timer
                  </button>
                  {step.timer.mode === "background" && (
                    <span className="text-base text-[var(--mute)]">Keeps running. Move on.</span>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => run(startStepTimer)} className={buttonGhost}>
                  {rang ? "Run it again" : "Start timer"} · {formatDuration(step.timer.seconds)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
