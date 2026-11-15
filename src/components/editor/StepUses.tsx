import { IngredientToken } from "@/components/stage";
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
      <legend className="text-base font-semibold">Ingredients used in this step</legend>
      {named.length === 0 ? (
        <p className="mt-1 text-[var(--ink-soft)]">Add ingredients above, then tick the ones this step uses.</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {named.map((ing) => {
            const mode = modeOf(step, ing.id);
            const at = `step-${index}-use-${ing.id}`;
            return (
              <li key={ing.id} className="flex flex-wrap items-center gap-x-4 gap-y-0">
                <label htmlFor={at} className="flex min-h-11 items-center gap-3 text-lg">
                  <input
                    id={at}
                    type="checkbox"
                    checked={mode !== "off"}
                    onChange={(event) => onChange(setUse(step, ing.id, event.target.checked ? "new" : "off"))}
                    className="size-6 accent-[var(--tomato)]"
                  />
                  <IngredientToken ingredient={{ ...ing, quantity: null, unit: null }} size={28} />
                  {ing.name}
                </label>
                {mode !== "off" && (
                  <label htmlFor={`${at}-earlier`} className="flex min-h-11 items-center gap-2 text-base text-[var(--ink-soft)]">
                    <input
                      id={`${at}-earlier`}
                      type="checkbox"
                      checked={mode === "earlier"}
                      onChange={(event) => onChange(setUse(step, ing.id, event.target.checked ? "earlier" : "new"))}
                      className="size-5 accent-[var(--tomato)]"
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
