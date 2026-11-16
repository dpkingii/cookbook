"use client";

import { moveItem } from "@/lib/recipes/edit";
import { blankStep, type FormState, type StepForm } from "@/lib/recipes/form";
import { StepCard } from "./StepCard";
import { errorClass, hintClass, secondaryButton, section, sectionTitle } from "./ui";

export function StepsSection({
  form,
  setForm,
  activeStep,
  setActiveStep,
  focusAfter,
  error,
}: {
  form: FormState;
  setForm: (update: (form: FormState) => FormState) => void;
  activeStep: number;
  setActiveStep: (index: number) => void;
  focusAfter: (id: string) => void;
  error: (field: string) => string | undefined;
}) {
  const steps = form.steps;

  const replace = (index: number, next: StepForm) =>
    setForm((f) => ({ ...f, steps: f.steps.map((step, i) => (i === index ? next : step)) }));

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    const more = dir === -1 ? to > 0 : to < steps.length - 1;
    focusAfter(`step-${to}-${more === (dir === -1) ? "up" : "down"}`);
    setForm((f) => ({ ...f, steps: moveItem(f.steps, index, to) }));
    setActiveStep(to);
  };

  return (
    <section aria-labelledby="steps-heading" className={section}>
      <h2 id="steps-heading" className={sectionTitle}>
        Steps
      </h2>
      <p className={`mt-1 ${hintClass}`}>
        The preview shows the step you are editing. Change the technique, heat or ingredients and watch it update.
      </p>

      <ol className="mt-4 border-b border-[var(--rule)]">
        {steps.map((step, index) => (
          <StepCard
            key={step.key}
            index={index}
            count={steps.length}
            step={step}
            ingredients={form.ingredients}
            active={index === activeStep}
            error={error}
            onChange={(next) => replace(index, next)}
            onMove={(dir) => move(index, dir)}
            onActivate={() => setActiveStep(index)}
            onRemove={() => {
              focusAfter("add-step");
              setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
              setActiveStep(Math.max(0, Math.min(activeStep > index ? activeStep - 1 : activeStep, steps.length - 2)));
            }}
          />
        ))}
      </ol>

      {error("add-step") && (
        <p className={`mt-3 ${errorClass}`}>{error("add-step")}</p>
      )}
      <button
        id="add-step"
        type="button"
        className={`${secondaryButton} mt-5`}
        onClick={() => {
          focusAfter(`step-${steps.length}-text`);
          setForm((f) => ({ ...f, steps: [...f.steps, blankStep()] }));
          setActiveStep(steps.length);
        }}
      >
        Add step
      </button>
    </section>
  );
}
