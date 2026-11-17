"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "@/lib/recipe/types";
import { Stage } from "@/components/stage";

const STEP_MS = 3600;

/** Auto-plays through the recipe so the cover shows what cooking mode looks like. */
export function HeroStage({ recipe }: { recipe: Recipe }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), STEP_MS / 12);
    return () => clearInterval(id);
  }, []);

  const stepIndex = Math.floor(tick / 12) % recipe.steps.length;
  const step = recipe.steps[stepIndex];

  return (
    <figure className="sheet">
      <Stage recipe={recipe} stepIndex={stepIndex} progress={step.timer ? (tick % 12) / 11 : null} />
      <figcaption className="border-t-2 border-[var(--ink)] px-4 py-3">
        <span className="label-caps">
          Step {stepIndex + 1} of {recipe.steps.length}
        </span>
        <span className="mt-1 block font-serif text-xl font-medium leading-snug">{step.text}</span>
      </figcaption>
    </figure>
  );
}
