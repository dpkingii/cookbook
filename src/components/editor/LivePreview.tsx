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
      className="sticky top-0 z-20 -mx-5 border-b border-[var(--rule)] bg-white px-5 py-2 sm:-mx-6 sm:px-6 lg:col-start-2 lg:row-start-1 lg:top-4 lg:mx-0 lg:self-start lg:border-b-0 lg:p-0"
    >
      <div className="flex items-center gap-3 lg:block">
        <div className="w-36 shrink-0 border border-[var(--rule)] bg-white lg:w-full">
          {step ? (
            <Stage recipe={recipe} stepIndex={stepIndex} progress={step.timer ? progress / 100 : null} />
          ) : (
            <p className="p-6 text-center text-[var(--mute)]">Add a step to see it play.</p>
          )}
        </div>
        {step && (
          <div className="min-w-0 flex-1 lg:mt-3">
            <p className="label-caps">
              Step {stepIndex + 1} of {recipe.steps.length} · {step.technique}
            </p>
            <p className="text-sm text-[var(--mute)] lg:text-base">
              At the {TECHNIQUE_STATION[step.technique]}
              {step.heat ? `, ${step.heat} heat` : ""}
            </p>
            {step.timer && (
              <label className="mt-1 block text-sm font-medium lg:mt-3 lg:text-base">
                Timer progress
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  aria-valuetext={`${progress} percent of the timer`}
                  className="mt-1 block h-8 w-full accent-[var(--ink)]"
                />
              </label>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
