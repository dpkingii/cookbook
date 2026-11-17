"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TECHNIQUE_STATION, type Recipe, type Station } from "@/lib/recipe/types";
import type { Tone } from "@/components/site/AppShell";
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
import { textLink } from "@/components/ui/styles";
import { wideColumn } from "./focus";
import { useSession } from "./useSession";
import { MiseScreen } from "./MiseScreen";
import { StepScreen } from "./StepScreen";
import { StepBar } from "./StepBar";
import { FinishScreen } from "./FinishScreen";
import { TimerDock } from "./TimerDock";

/** Each station has its own pastel, which tints the stage's shadow and the current step. */
const STATION_TONE: Record<Station, Tone> = { board: "mint", bowl: "sun", pan: "tomato", pot: "sky", oven: "pink", rest: "lilac" };

export function CookPlayer({ recipe }: { recipe: Recipe }) {
  const { state, now, ready, run, restart, flush, sessionId } = useSession(recipe);
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

  const tone = showWrapUp ? "pink" : cooking ? STATION_TONE[TECHNIQUE_STATION[recipe.steps[state.currentStep].technique]] : "sun";

  if (!ready) return <div data-tone="sun" className="min-h-dvh bg-[var(--bg)]" />;

  return (
    <div data-tone={tone} className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className={`mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-5 pt-2 ${showWrapUp ? "" : wideColumn}`}>
        <Link href={`/recipes/${recipe.id}`} className="label-caps flex min-h-11 items-center truncate hover:text-[var(--ink)]">
          {recipe.title}
        </Link>
        {cooking && !showWrapUp && (
          <button
            type="button"
            onClick={() => run(state.paused ? resume : pause)}
            className={`${textLink} min-h-11 shrink-0 px-1`}
          >
            {state.paused ? "Resume" : "Pause"}
          </button>
        )}
      </header>

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
        <>
          <StepScreen recipe={recipe} state={state} now={now} run={run} onNext={goNext} onBack={goBack} />
          <StepBar
            recipe={recipe}
            state={state}
            now={now}
            onNext={goNext}
            onBack={goBack}
            dock={
              <TimerDock
                recipe={recipe}
                state={state}
                now={now}
                onAcknowledge={(id) => run((ctx) => acknowledgeTimer(ctx, id))}
              />
            }
          />
        </>
      )}
      {showWrapUp && (
        <FinishScreen
          recipe={recipe}
          state={state}
          flush={flush}
          sessionId={sessionId}
          onFinish={(result) => run((ctx) => finish(ctx, result))}
          onBackToSteps={() => setWrapUp(false)}
          onRestart={() => {
            setWrapUp(false);
            restart();
          }}
        />
      )}
    </div>
  );
}
