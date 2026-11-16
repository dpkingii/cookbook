"use client";

import { useRef, useState } from "react";
import { buttonGhost, buttonPrimary, input } from "@/components/ui/styles";
import { focusRing } from "./focus";
import { Footer } from "./Footer";
import { RATINGS } from "./ratings";

export function FinishRating({
  onSave,
  onSkip,
  onBack,
}: {
  onSave: (result: { rating?: number; note?: string }) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const n = (to + RATINGS.length) % RATINGS.length;
    setRating(n + 1);
    radios.current[n]?.focus();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">How did it go</p>
        <h1 tabIndex={-1} className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] outline-none sm:text-4xl">
          How did it turn out?
        </h1>

        <div role="radiogroup" aria-label="Rating" className="mt-6 border-b border-[var(--rule)]">
          {RATINGS.map((label, n) => {
            const on = rating === n + 1;
            return (
              <button
                key={label}
                ref={(el) => {
                  radios.current[n] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on || (rating === 0 && n === 0) ? 0 : -1}
                onClick={() => setRating(n + 1)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    e.preventDefault();
                    move(n + 1);
                  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    move(n - 1);
                  }
                }}
                className={`flex min-h-12 w-full items-center gap-4 border-t border-[var(--rule)] px-3 text-left text-lg ${
                  on ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-white" : ""
                } ${focusRing}`}
              >
                <span className={`w-4 text-base tabular-nums ${on ? "text-white" : "text-[var(--mute)]"}`}>{n + 1}</span>
                {label}
              </button>
            );
          })}
        </div>

        <label className="label-caps mt-6 block" htmlFor="cook-note">
          One note for next time
        </label>
        <textarea
          id="cook-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="More garlic. Pull the pasta a minute earlier."
          className={`${input} mt-2 resize-none`}
        />
      </div>

      <Footer>
        <button type="button" onClick={onBack} className={buttonGhost}>
          Back
        </button>
        <button type="button" onClick={onSkip} className={buttonGhost}>
          Skip
        </button>
        <button
          type="button"
          onClick={() => onSave({ rating: rating || undefined, note: note.trim() || undefined })}
          className={`${buttonPrimary} flex-1`}
        >
          Save this cook
        </button>
      </Footer>
    </>
  );
}
