import type { StepForm } from "@/lib/recipes/form";
import { Field } from "./Field";
import { checkbox, inputClass } from "./ui";

export function StepTimer({
  index,
  step,
  error,
  onChange,
}: {
  index: number;
  step: StepForm;
  error?: string;
  onChange: (next: StepForm) => void;
}) {
  const at = `step-${index}-timer`;
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Timer</legend>
      <label htmlFor={`${at}-on`} className="flex min-h-11 items-center gap-3 text-base font-medium">
        <input
          id={`${at}-on`}
          type="checkbox"
          checked={step.timerOn}
          onChange={(event) => onChange({ ...step, timerOn: event.target.checked })}
          className={checkbox}
        />
        This step has a timer
      </label>
      {step.timerOn && (
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field id={`${at}-minutes`} label="Minutes" error={error}>
            {(props) => (
              <input
                {...props}
                inputMode="numeric"
                placeholder="0"
                className={inputClass}
                value={step.timerMinutes}
                onChange={(event) => onChange({ ...step, timerMinutes: event.target.value })}
              />
            )}
          </Field>
          <Field id={`${at}-seconds`} label="Seconds">
            {(props) => (
              <input
                {...props}
                inputMode="numeric"
                placeholder="0"
                className={inputClass}
                value={step.timerSeconds}
                onChange={(event) => onChange({ ...step, timerSeconds: event.target.value })}
              />
            )}
          </Field>
          <Field id={`${at}-mode`} label="While it runs" className="col-span-2">
            {(props) => (
              <select
                {...props}
                className={inputClass}
                value={step.timerMode}
                onChange={(event) => onChange({ ...step, timerMode: event.target.value as StepForm["timerMode"] })}
              >
                <option value="stay">Stay on this step</option>
                <option value="background">Run in the background</option>
              </select>
            )}
          </Field>
          <Field id={`${at}-label`} label="Timer label" className="col-span-2 sm:col-span-4">
            {(props) => (
              <input
                {...props}
                placeholder="Noodles"
                className={inputClass}
                value={step.timerLabel}
                onChange={(event) => onChange({ ...step, timerLabel: event.target.value })}
              />
            )}
          </Field>
        </div>
      )}
    </fieldset>
  );
}
