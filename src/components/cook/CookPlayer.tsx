"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/recipe/types";
import {
  acknowledgeTimer,
  back,
  beginCooking,
  finish,
  next,
  pause,
  resume,
  toggleMise,
} from "@/lib/player";
import { unlockAudio } from "@/lib/kitchen/chime";
import { useWakeLock } from "@/lib/kitchen/useWakeLock";
import { useSession } from "./useSession";
import { MiseScreen } from "./MiseScreen";
import { StepScreen } from "./StepScreen";
import { FinishScreen } from "./FinishScreen";
import { TimerDock } from "./TimerDock";

export function CookPlayer({ recipe }: { recipe: Recipe }) {
  const { state, now, ready, run, restart } = useSession(recipe);
  const [wrapUp, setWrapUp] = useState(false);
  const lastStep = state.currentStep === recipe.steps.length - 1;
  const cooking = state.phase === "cooking";
  const showWrapUp = state.phase === "finished" || (wrapUp && cooking);

  useWakeLock(cooking && !state.paused);

  const goNext = () => {
    if (state.paused) return;
    run(next);
    if (lastStep) setWrapUp(true);
  };
  const goBack = () => {
    if (!state.paused) run(back);
  };

  useEffect(() => {
    if (!cooking || showWrapUp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, button")) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!ready) return <div className="min-h-dvh bg-[var(--paper)]" />;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <Link
          href={`/recipes/${recipe.id}`}
          className="font-serif text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
        >
          {recipe.title}
        </Link>
        {cooking && !showWrapUp && (
          <button
            type="button"
            onClick={() => run(state.paused ? resume : pause)}
            className="rounded-full border-2 border-[var(--ink)] px-4 py-1.5 text-sm font-semibold"
          >
            {state.paused ? "Resume" : "Pause"}
          </button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 sm:px-6">
        {state.phase === "mise" && (
          <MiseScreen
            recipe={recipe}
            checked={state.checked}
            onToggle={(id) => run((ctx) => toggleMise(ctx, id))}
            onStart={() => {
              unlockAudio();
              run(beginCooking);
            }}
          />
        )}
        {cooking && !showWrapUp && (
          <StepScreen
            recipe={recipe}
            state={state}
            now={now}
            run={run}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {showWrapUp && (
          <FinishScreen
            recipe={recipe}
            state={state}
            onFinish={(result) => run((ctx) => finish(ctx, result))}
            onBackToSteps={() => setWrapUp(false)}
            onRestart={() => {
              setWrapUp(false);
              restart();
            }}
          />
        )}
      </main>

      {cooking && (
        <TimerDock
          recipe={recipe}
          state={state}
          now={now}
          onAcknowledge={(id) => run((ctx) => acknowledgeTimer(ctx, id))}
        />
      )}
    </div>
  );
}
