import { IngredientToken } from "@/components/stage";
import { checkbox, labelClass } from "./ui";
import { setUse, modeOf } from "@/lib/recipes/edit";
import type { IngredientForm, StepForm } from "@/lib/recipes/form";

export function StepUses({
  index,
  step,
  ingredients,
  onChange,
}: {
  index: number;
  step: StepForm;
  ingredients: IngredientForm[];
  onChange: (next: StepForm) => void;
}) {
  const named = ingredients.filter((ing) => ing.name.trim());
  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>Ingredients used in this step</legend>
      {named.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--mute)]">Add ingredients above, then tick the ones this step uses.</p>
      ) : (
        <ul className="mt-1 border-b border-[var(--rule)]">
          {named.map((ing) => {
            const mode = modeOf(step, ing.id);
            const at = `step-${index}-use-${ing.id}`;
            return (
              <li key={ing.id} className="flex flex-wrap items-center gap-x-4 gap-y-0 border-t border-[var(--rule)]">
                <label htmlFor={at} className="flex min-h-11 items-center gap-3 text-base">
                  <input
                    id={at}
                    type="checkbox"
                    checked={mode !== "off"}
                    onChange={(event) => onChange(setUse(step, ing.id, event.target.checked ? "new" : "off"))}
                    className={checkbox}
                  />
                  <IngredientToken ingredient={{ ...ing, quantity: null, unit: null }} size={28} />
                  {ing.name}
                </label>
                {mode !== "off" && (
                  <label htmlFor={`${at}-earlier`} className="flex min-h-11 items-center gap-2 text-sm text-[var(--mute)]">
                    <input
                      id={`${at}-earlier`}
                      type="checkbox"
                      checked={mode === "earlier"}
                      onChange={(event) => onChange(setUse(step, ing.id, event.target.checked ? "earlier" : "new"))}
                      className={checkbox}
                    />
                    Used earlier, add nothing new
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
