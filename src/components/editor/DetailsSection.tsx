import type { Difficulty } from "@/lib/recipe/types";
import type { FormState } from "@/lib/recipes/form";
import { Field } from "./Field";
import { inputClass, panel } from "./ui";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function DetailsSection({
  form,
  onChange,
  error,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  error: (field: string) => string | undefined;
}) {
  return (
    <section aria-labelledby="details-heading" className={panel}>
      <h2 id="details-heading" className="font-serif text-3xl font-semibold">
        Recipe details
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Title" error={error("title")} className="sm:col-span-2">
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={form.title}
              onChange={(event) => onChange({ title: event.target.value })}
              autoComplete="off"
            />
          )}
        </Field>
        <Field id="description" label="Description" hint="One or two sentences for the recipe page." className="sm:col-span-2">
          {(props) => (
            <textarea
              {...props}
              rows={2}
              className={inputClass}
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          )}
        </Field>
        <Field id="cuisine" label="Cuisine" hint="For example Italian. Leave blank for Other.">
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={form.cuisine}
              onChange={(event) => onChange({ cuisine: event.target.value })}
            />
          )}
        </Field>
        <Field id="difficulty" label="Difficulty">
          {(props) => (
            <select
              {...props}
              className={`${inputClass} capitalize`}
              value={form.difficulty}
              onChange={(event) => onChange({ difficulty: event.target.value as Difficulty })}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          {(
            [
              ["servings", "Servings", "2"],
              ["prepMinutes", "Prep (min)", "0"],
              ["cookMinutes", "Cook (min)", "0"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <Field key={key} id={key} label={label} error={error(key)}>
              {(props) => (
                <input
                  {...props}
                  inputMode="numeric"
                  placeholder={placeholder}
                  className={inputClass}
                  value={form[key]}
                  onChange={(event) => onChange({ [key]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        <label className="flex min-h-11 items-start gap-3 sm:col-span-2">
          <input
            type="checkbox"
            role="switch"
            checked={form.isPublic}
            onChange={(event) => onChange({ isPublic: event.target.checked })}
            className="mt-1 size-6 shrink-0 accent-[var(--tomato)]"
          />
          <span>
            <span className="block text-lg font-semibold">
              {form.isPublic ? "Public: everyone can find this recipe" : "Private: only you can see this recipe"}
            </span>
            <span className="block text-sm text-[var(--ink-soft)]">
              Public recipes appear in the catalogue on the home page.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
