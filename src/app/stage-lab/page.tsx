"use client";

import { useEffect, useMemo, useState } from "react";
import { IngredientToken, Stage } from "@/components/stage";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import { TECHNIQUES, TECHNIQUE_STATION, type Recipe, type Technique } from "@/lib/recipe/types";

const recipe = DEMO_RECIPE;
const SAMPLE_USES: Record<string, string[]> = {
  board: ["onion"],
  bowl: ["tomatoes", "basil"],
  pan: ["oil", "garlic"],
  pot: ["spaghetti"],
  oven: ["tomatoes", "garlic"],
  rest: ["parmesan"],
};

function single(technique: Technique): Recipe {
  const station = TECHNIQUE_STATION[technique];
  const uses = technique === "season" ? ["salt"] : technique === "simmer" ? ["tomatoes"] : SAMPLE_USES[station];
  const heated = station === "pan" || station === "pot" || station === "oven";
  return {
    ...recipe,
    id: `lab-${technique}`,
    steps: [
      {
        text: technique,
        technique,
        heat: heated && technique !== "drain" ? (technique === "boil" ? "high" : "medium") : undefined,
        uses: uses.map((ingredientId) => ({ ingredientId })),
      },
    ],
  };
}

export default function StageLab() {
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(0);
  const [noTimer, setNoTimer] = useState(false);
  const step = recipe.steps[i];
  const last = recipe.steps.length - 1;
  const gallery = useMemo(() => TECHNIQUES.map((t) => ({ t, r: single(t) })), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setI((n) => Math.min(last, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const progress = noTimer || !step.timer ? null : pct / 100;

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-[family-name:var(--font-lora)] text-3xl font-bold">Stage lab</h1>
          <p className="text-sm text-[var(--ink-soft)]">{recipe.title} · arrow keys step through</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="overflow-hidden rounded-xl border-2 border-[var(--ink)]">
            <Stage recipe={recipe} stepIndex={i} progress={progress} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                disabled={i === 0}
                className="rounded-full border-2 border-[var(--ink)] px-4 py-2 font-semibold disabled:opacity-30"
              >
                Prev
              </button>
              <span className="tabular-nums text-sm text-[var(--ink-soft)]">
                Step {i + 1} / {recipe.steps.length}
              </span>
              <button
                type="button"
                onClick={() => setI((n) => Math.min(last, n + 1))}
                disabled={i === last}
                className="rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-4 py-2 font-semibold text-[var(--paper)] disabled:opacity-30"
              >
                Next
              </button>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
                {step.technique}
                {step.heat ? ` · ${step.heat} heat` : " · no heat"}
                {step.timer ? ` · ${Math.round(step.timer.seconds / 60)} min` : ""}
              </p>
              <p className="font-[family-name:var(--font-lora)] text-2xl font-semibold leading-snug">{step.text}</p>
              {step.cue && <p className="mt-1 text-sm text-[var(--ink-soft)]">Look for: {step.cue}</p>}
            </div>

            <div className="rounded-lg bg-[var(--paper-deep)] p-3">
              <label className="flex items-center gap-3 text-sm">
                <span className="w-16">Progress</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  disabled={noTimer || !step.timer}
                  onChange={(e) => setPct(Number(e.target.value))}
                  className="flex-1 accent-[var(--tomato)]"
                />
                <span className="w-10 text-right tabular-nums">{progress == null ? "null" : `${pct}%`}</span>
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={noTimer} onChange={(e) => setNoTimer(e.target.checked)} />
                No timer (progress = null)
                {!step.timer && <span className="text-[var(--ink-soft)]">· this step has no timer</span>}
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              {step.uses.map((u) => {
                const ing = recipe.ingredients.find((x) => x.id === u.ingredientId);
                return ing ? (
                  <span key={u.ingredientId} className="flex items-center gap-1.5 text-sm">
                    <IngredientToken ingredient={ing} size={28} />
                    {ing.name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-3 font-[family-name:var(--font-lora)] text-xl font-bold">Ingredient tokens</h2>
          <div className="flex flex-wrap gap-5">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex w-20 flex-col items-center gap-1 text-center text-xs">
                <IngredientToken ingredient={ing} size={56} />
                {ing.name}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-3 font-[family-name:var(--font-lora)] text-xl font-bold">Every step at 0, 50 and 100%</h2>
          <div className="flex flex-col gap-5">
            {recipe.steps.map((s, k) => (
              <div key={k}>
                <p className="mb-1 text-sm">
                  <button type="button" onClick={() => setI(k)} className="font-semibold underline decoration-[var(--tomato)]">
                    {k + 1}. {s.technique}
                  </button>{" "}
                  <span className="text-[var(--ink-soft)]">{s.text}</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 0.5, 1].map((p) => (
                    <div key={p} className="overflow-hidden rounded-md border border-[var(--ink-soft)]">
                      <Stage recipe={recipe} stepIndex={k} progress={p} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-3 font-[family-name:var(--font-lora)] text-xl font-bold">Every technique, alone</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map(({ t, r }) => (
              <div key={t}>
                <div className="overflow-hidden rounded-md border border-[var(--ink-soft)]">
                  <Stage recipe={r} stepIndex={0} progress={0.5} />
                </div>
                <p className="mt-1 text-xs">
                  {t} <span className="text-[var(--ink-soft)]">· {TECHNIQUE_STATION[t]}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
