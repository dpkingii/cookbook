"use client";

import { useState } from "react";
import { Stage } from "@/components/stage";
import { TECHNIQUE_STATION, type Recipe } from "@/lib/recipe/types";

export function LivePreview({ recipe, stepIndex }: { recipe: Recipe; stepIndex: number }) {
  const [progress, setProgress] = useState(60);
  const step = recipe.steps[stepIndex];

  return (
    <aside
      aria-label="Live preview"
      className="sticky top-0 z-20 -mx-4 border-b-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-2 lg:col-start-2 lg:row-start-1 lg:top-4 lg:mx-0 lg:self-start lg:border-b-0 lg:bg-transparent lg:p-0"
    >
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-2 lg:block lg:rounded-3xl lg:p-3 lg:shadow-[6px_6px_0_var(--tomato)]">
        <div className="w-36 shrink-0 lg:w-full">
          {step ? (
            <Stage recipe={recipe} stepIndex={stepIndex} progress={step.timer ? progress / 100 : null} />
          ) : (
            <p className="p-6 text-center text-[var(--ink-soft)]">Add a step to see it play.</p>
          )}
        </div>
        {step && (
          <div className="min-w-0 flex-1 lg:mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tomato-deep)]">
              Step {stepIndex + 1} of {recipe.steps.length} · {step.technique}
            </p>
            <p className="text-sm text-[var(--ink-soft)] lg:text-base">
              At the {TECHNIQUE_STATION[step.technique]}
              {step.heat ? `, ${step.heat} heat` : ""}
            </p>
            {step.timer && (
              <label className="mt-1 block text-sm font-semibold lg:mt-3 lg:text-base">
                Timer progress
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  aria-valuetext={`${progress} percent of the timer`}
                  className="mt-1 block h-8 w-full accent-[var(--tomato)]"
                />
              </label>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
