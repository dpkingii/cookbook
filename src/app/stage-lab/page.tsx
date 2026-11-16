"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IngredientToken, Stage } from "@/components/stage";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import {
  stationOf,
  TECHNIQUES,
  TECHNIQUE_STATION,
  type Heat,
  type Ingredient,
  type Recipe,
  type Technique,
} from "@/lib/recipe/types";

const recipe = DEMO_RECIPE;
const SAMPLE_USES: Record<string, string[]> = {
  board: ["onion"],
  bowl: ["tomatoes", "basil"],
  pan: ["oil", "garlic"],
  pot: ["spaghetti"],
  oven: ["tomatoes", "garlic"],
  rest: ["parmesan"],
};

/** Extra pantry for the lab, so each bowl and oven technique gets something it would really hold. */
const LAB_INGREDIENTS: Ingredient[] = [
  { id: "eggs", name: "eggs", quantity: 3, unit: null, token: { shape: "round", color: "#f2c94c" } },
  { id: "soy", name: "soy sauce", quantity: 2, unit: "tbsp", token: { shape: "liquid", color: "#3b2418" } },
  { id: "yoghurt", name: "yoghurt", quantity: 200, unit: "g", token: { shape: "liquid", color: "#f6f2e6" } },
  { id: "flour", name: "flour", quantity: 300, unit: "g", token: { shape: "grain", color: "#efe3c4" } },
  { id: "water", name: "water", quantity: 180, unit: "ml", token: { shape: "liquid", color: "#a9cfe0" } },
  { id: "chicken", name: "chicken thighs", quantity: 400, unit: "g", token: { shape: "cube", color: "#e8c3a0" } },
];
const NEW_TECHNIQUES: Technique[] = ["whisk", "fold", "knead", "marinate", "roast", "bake", "broil"];
const LAB_USES: Partial<Record<Technique, string[]>> = {
  whisk: ["eggs", "soy", "salt"],
  fold: ["yoghurt", "tomatoes"],
  knead: ["flour", "water"],
  marinate: ["chicken", "soy"],
  roast: ["tomatoes", "garlic", "onion"],
  bake: ["flour", "eggs"],
  broil: ["chicken"],
};
const HEATS: Heat[] = ["low", "medium", "high"];

function single(technique: Technique, heat?: Heat): Recipe {
  const station = TECHNIQUE_STATION[technique];
  const uses = LAB_USES[technique] ?? (technique === "season" ? ["salt"] : technique === "simmer" ? ["tomatoes"] : SAMPLE_USES[station]);
  const heated = station === "pan" || station === "pot" || station === "oven";
  const fallbackHeat = technique === "boil" || technique === "broil" ? "high" : "medium";
  return {
    ...recipe,
    id: `lab-${technique}`,
    ingredients: [...recipe.ingredients, ...LAB_INGREDIENTS],
    steps: [
      {
        text: technique,
        technique,
        heat: heated && technique !== "drain" ? (heat ?? fallbackHeat) : undefined,
        uses: uses.map((ingredientId) => ({ ingredientId })),
      },
    ],
  };
}

const SEED_STEPS = SEED_RECIPES.flatMap((r) =>
  r.steps.flatMap((st, k) => (stationOf(st) === "bowl" || stationOf(st) === "oven" ? [{ r, k, st }] : [])),
);

function Frame({ r, k, p, children }: { r: Recipe; k: number; p: number | null; children?: React.ReactNode }) {
  return (
    <div>
      <div className="overflow-hidden border border-[var(--rule)]">
        <Stage recipe={r} stepIndex={k} progress={p} />
      </div>
      {children && <p className="mt-1.5 text-xs text-[var(--ink)]">{children}</p>}
    </div>
  );
}

function NewStations({ narrow = false }: { narrow?: boolean }) {
  const cols = narrow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3";
  return (
    <>
      <section className="mt-12">
        <h2 className="mb-4 font-serif text-xl font-medium">Bowl and oven at 0, 50 and 100%</h2>
        <div className="flex flex-col gap-5">
          {NEW_TECHNIQUES.map((t) => {
            const r = single(t);
            return (
              <div key={t}>
                <p className="label-caps mb-1.5">
                  <span className="text-[var(--ink)]">{t}</span> · {LAB_USES[t]?.join(", ")}
                </p>
                <div className={`grid gap-2 ${cols}`}>
                  {[0, 0.5, 1].map((p) => (
                    <Frame key={p} r={r} k={0} p={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-serif text-xl font-medium">Oven heat: low, medium, high</h2>
        {(["roast", "broil"] as const).map((t) => (
          <div key={t} className={`mb-4 grid gap-2 ${cols}`}>
            {HEATS.map((h) => (
              <Frame key={h} r={single(t, h)} k={0} p={0.5}>
                {t} · {h}
              </Frame>
            ))}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-serif text-xl font-medium">Seed recipes at the bowl and oven</h2>
        <div className={`grid gap-3 ${narrow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-4"}`}>
          {SEED_STEPS.map(({ r, k, st }) => (
            <Frame key={`${r.id}-${k}`} r={r} k={k} p={st.timer ? 0.5 : null}>
              {st.technique} <span className="text-[var(--mute)]">· {r.title} #{k + 1}</span>
            </Frame>
          ))}
        </div>
      </section>
    </>
  );
}

const noSubscribe = () => () => {};
/** ?only=new renders just the bowl and oven sections for screenshots; ?only=narrow does it 360px wide. */
const onlyParam = () => new URLSearchParams(window.location.search).get("only");

export default function StageLab() {
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(0);
  const [noTimer, setNoTimer] = useState(false);
  const only = useSyncExternalStore(noSubscribe, onlyParam, () => null);
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

  if (only === "new" || only === "narrow") {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-2 text-[var(--ink)] sm:px-8">
        <div className={only === "narrow" ? "w-[360px]" : "mx-auto max-w-5xl"}>
          <NewStations narrow={only === "narrow"} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl font-medium tracking-[-0.02em]">Stage lab</h1>
          <p className="label-caps">{recipe.title} · arrow keys step through</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="overflow-hidden border border-[var(--rule)]">
            <Stage recipe={recipe} stepIndex={i} progress={progress} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                disabled={i === 0}
                className="h-11 border border-[var(--ink)] px-4 text-sm font-medium disabled:opacity-30"
              >
                Prev
              </button>
              <span className="tabular-nums text-sm text-[var(--mute)]">
                Step {i + 1} / {recipe.steps.length}
              </span>
              <button
                type="button"
                onClick={() => setI((n) => Math.min(last, n + 1))}
                disabled={i === last}
                className="h-11 bg-[var(--ink)] px-4 text-sm font-medium text-[var(--bg)] disabled:opacity-30"
              >
                Next
              </button>
            </div>

            <div>
              <p className="label-caps mb-1">
                {step.technique}
                {step.heat ? ` · ${step.heat} heat` : " · no heat"}
                {step.timer ? ` · ${Math.round(step.timer.seconds / 60)} min` : ""}
              </p>
              <p className="font-serif text-2xl font-medium leading-snug">{step.text}</p>
              {step.cue && <p className="mt-1 text-sm text-[var(--mute)]">Look for: {step.cue}</p>}
            </div>

            <div className="border-y border-[var(--rule)] py-3">
              <label className="flex items-center gap-3 text-sm">
                <span className="label-caps w-20">Progress</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  disabled={noTimer || !step.timer}
                  onChange={(e) => setPct(Number(e.target.value))}
                  className="flex-1 accent-[var(--ink)]"
                />
                <span className="w-10 text-right tabular-nums">{progress == null ? "null" : `${pct}%`}</span>
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={noTimer} onChange={(e) => setNoTimer(e.target.checked)} />
                No timer (progress = null)
                {!step.timer && <span className="text-[var(--mute)]">· this step has no timer</span>}
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
          <h2 className="mb-4 font-serif text-xl font-medium">Ingredient tokens</h2>
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
          <h2 className="mb-4 font-serif text-xl font-medium">Every step at 0, 50 and 100%</h2>
          <div className="flex flex-col gap-5">
            {recipe.steps.map((s, k) => (
              <div key={k}>
                <p className="mb-1.5 text-sm">
                  <button type="button" onClick={() => setI(k)} className="font-medium underline underline-offset-2">
                    {k + 1}. {s.technique}
                  </button>{" "}
                  <span className="text-[var(--mute)]">{s.text}</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 0.5, 1].map((p) => (
                    <Frame key={p} r={recipe} k={k} p={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 font-serif text-xl font-medium">Every technique, alone</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map(({ t, r }) => (
              <Frame key={t} r={r} k={0} p={0.5}>
                {t} <span className="text-[var(--mute)]">· {TECHNIQUE_STATION[t]}</span>
              </Frame>
            ))}
          </div>
        </section>

        <NewStations />
      </div>
    </main>
  );
}
