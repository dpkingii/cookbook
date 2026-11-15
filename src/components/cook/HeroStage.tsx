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
    <figure className="rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-3 shadow-[6px_6px_0_var(--tomato)]">
      <Stage recipe={recipe} stepIndex={stepIndex} progress={step.timer ? (tick % 12) / 11 : null} />
      <figcaption className="px-2 pb-1 pt-2 text-lg">
        <span className="font-semibold">{stepIndex + 1}.</span> {step.text}
      </figcaption>
    </figure>
  );
}
