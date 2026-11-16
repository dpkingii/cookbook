"use client";

import { TECHNIQUE_STATION, STATIONS, type Heat, type Technique } from "@/lib/recipe/types";
import { guessStep } from "@/lib/recipes/edit";
import type { IngredientForm, StepForm } from "@/lib/recipes/form";
import { Field } from "./Field";
import { StepTimer } from "./StepTimer";
import { StepUses } from "./StepUses";
import { errorClass, hintClass, inputClass, secondaryButton, smallButton } from "./ui";

const STATION_LABEL = {
  board: "Cutting board",
  bowl: "Mixing bowl",
  pan: "Pan",
  pot: "Pot",
  oven: "Oven",
  rest: "Resting and serving",
} as const;

const TEXT_LIMIT = 160;

export function StepCard({
  index,
  count,
  step,
  ingredients,
  active,
  error,
  onChange,
  onMove,
  onRemove,
  onActivate,
}: {
  index: number;
  count: number;
  step: StepForm;
  ingredients: IngredientForm[];
  active: boolean;
  error: (field: string) => string | undefined;
  onChange: (next: StepForm) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onActivate: () => void;
}) {
  const at = `step-${index}`;
  const length = step.text.length;
  const tooLong = length > TEXT_LIMIT;

  return (
    <li
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      aria-current={active ? "step" : undefined}
      className="border-t border-[var(--rule)] py-5"
    >
      <div className={`border-l-2 pl-4 ${active ? "border-[var(--ink)]" : "border-transparent"}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-xl font-medium">Step {index + 1}</h3>
          <span className="ml-auto flex gap-2">
            <button id={`${at}-up`} type="button" className={smallButton} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move step ${index + 1} up`}>
              Up
            </button>
            <button id={`${at}-down`} type="button" className={smallButton} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move step ${index + 1} down`}>
              Down
            </button>
            <button type="button" className={smallButton} onClick={onRemove} aria-label={`Remove step ${index + 1}`}>
              Remove
            </button>
          </span>
        </div>

        <div className="mt-3 grid gap-5">
          <div>
            <Field id={`${at}-text`} label="What to do" error={error(`${at}-text`)}>
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  className={inputClass}
                  value={step.text}
                  onChange={(event) => onChange({ ...step, text: event.target.value })}
                />
              )}
            </Field>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p
                id={`${at}-count`}
                aria-live="polite"
                className={tooLong ? errorClass : hintClass}
              >
                {length} / {TEXT_LIMIT} characters
                {tooLong && ": long for a step screen. Try splitting it in two."}
              </p>
              <button type="button" className={secondaryButton} onClick={() => onChange(guessStep(step))}>
                Guess from text
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${at}-technique`} label="Technique">
              {(props) => (
                <select
                  {...props}
                  className={`${inputClass} capitalize`}
                  value={step.technique}
                  onChange={(event) => onChange({ ...step, technique: event.target.value as Technique })}
                >
                  {STATIONS.map((station) => (
                    <optgroup key={station} label={STATION_LABEL[station]}>
                      {(Object.keys(TECHNIQUE_STATION) as Technique[])
                        .filter((t) => TECHNIQUE_STATION[t] === station)
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </Field>
            <Field id={`${at}-heat`} label="Heat">
              {(props) => (
                <select
                  {...props}
                  className={inputClass}
                  value={step.heat}
                  onChange={(event) => onChange({ ...step, heat: event.target.value as Heat | "" })}
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              )}
            </Field>
          </div>

          <StepTimer index={index} step={step} error={error(`${at}-timer-minutes`)} onChange={onChange} />

          <Field id={`${at}-cue`} label="What done looks like" hint="Optional. Shown while cooking, for example “golden at the edges”.">
            {(props) => (
              <input
                {...props}
                className={inputClass}
                value={step.cue}
                onChange={(event) => onChange({ ...step, cue: event.target.value })}
              />
            )}
          </Field>

          <StepUses index={index} step={step} ingredients={ingredients} onChange={onChange} />
        </div>
      </div>
    </li>
  );
}
