"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/recipe/types";
import { summary, type PlayerState } from "@/lib/player";
import { formatDuration } from "./format";

const RATINGS = ["Not again", "It was fine", "Good", "Really good", "Best yet"];

export function FinishScreen({
  recipe,
  state,
  onFinish,
  onBackToSteps,
  onRestart,
}: {
  recipe: Recipe;
  state: PlayerState;
  onFinish: (result: { rating?: number; note?: string }) => void;
  onBackToSteps: () => void;
  onRestart: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  if (state.phase !== "finished") {
    return (
      <div className="flex flex-1 flex-col pt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
          Plates down
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          How did it turn out?
        </h1>

        <div role="radiogroup" aria-label="Rating" className="mt-6 grid gap-2">
          {RATINGS.map((label, n) => {
            const value = n + 1;
            const on = rating === value;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRating(value)}
                className={`flex items-center gap-3 rounded-2xl border-2 border-[var(--ink)] px-4 py-3 text-left text-xl font-semibold transition-all ${
                  on ? "bg-[var(--gold)] shadow-[3px_3px_0_var(--ink)]" : "bg-[var(--paper)]"
                }`}
              >
                <span className="font-mono text-base text-[var(--ink-soft)]">{value}</span>
                {label}
              </button>
            );
          })}
        </div>

        <label className="mt-6 block text-lg font-semibold" htmlFor="cook-note">
          One note for next time
        </label>
        <textarea
          id="cook-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="More garlic. Pull the pasta a minute earlier."
          className="mt-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3 text-lg placeholder:text-[var(--ink-soft)]/70"
        />

        <div className="sticky bottom-4 mt-auto flex gap-3 pt-6">
          <button
            type="button"
            onClick={onBackToSteps}
            className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-6 py-4 text-xl font-bold"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() =>
              onFinish({ rating: rating || undefined, note: note.trim() || undefined })
            }
            className="flex-1 rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] py-4 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Save this cook
          </button>
        </div>
      </div>
    );
  }

  const s = summary(state, recipe);
  return (
    <div className="flex flex-1 flex-col pt-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
        Cooked
      </p>
      <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
        {recipe.title}
      </h1>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          ["Time", formatDuration(s.durationSeconds)],
          ["Steps", `${s.completedSteps} of ${s.totalSteps}`],
          ["Rating", state.rating ? RATINGS[state.rating - 1] : "None"],
        ].map(([term, value]) => (
          <div key={term} className="rounded-2xl border-2 border-[var(--ink)] p-3">
            <dt className="text-sm uppercase tracking-widest text-[var(--ink-soft)]">{term}</dt>
            <dd className="mt-1 font-serif text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-6 text-lg font-semibold">Techniques you practised</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {s.techniques.map((t) => (
          <li
            key={t}
            className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper-deep)] px-4 py-1 text-lg capitalize"
          >
            {t}
          </li>
        ))}
      </ul>

      {!s.plausible && (
        <p className="mt-4 border-l-4 border-[var(--gold)] pl-3 text-lg text-[var(--ink-soft)]">
          That was faster than the timers allow, so this one reads as a walkthrough, not a cook.
        </p>
      )}
      {state.note && (
        <p className="mt-4 border-l-4 border-[var(--tomato)] pl-3 font-serif text-xl italic">
          {state.note}
        </p>
      )}

      <div className="sticky bottom-4 mt-auto pt-6">
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-4 text-xl font-bold shadow-[4px_4px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Cook it again
        </button>
      </div>
    </div>
  );
}
