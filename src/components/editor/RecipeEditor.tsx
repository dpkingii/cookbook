"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveRecipe } from "@/lib/recipes/actions";
import { removeIngredient } from "@/lib/recipes/edit";
import { draftToForm, emptyForm, formToInput, formToRecipe, type EditableRecipe, type FormState } from "@/lib/recipes/form";
import { validateForm } from "@/lib/recipes/validate";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailsSection } from "./DetailsSection";
import { IngredientsSection } from "./IngredientsSection";
import { LivePreview } from "./LivePreview";
import { LoginPrompt } from "./LoginPrompt";
import { StepsSection } from "./StepsSection";
import { errorClass, linkButton, primaryButton, sectionTitle, smallButton } from "./ui";
import { useLeaveGuard } from "./useLeaveGuard";

export function RecipeEditor({
  initial,
  recipeId,
  warnings: initialWarnings = [],
  unsaved = false,
  onStartOver,
}: {
  initial?: EditableRecipe;
  recipeId?: string;
  warnings?: string[];
  unsaved?: boolean;
  onStartOver?: () => void;
}) {
  const [start] = useState<FormState>(() => (initial ? draftToForm(initial) : emptyForm()));
  const [baseline] = useState(() => JSON.stringify(start));
  const [form, setFormState] = useState<FormState>(start);
  const [activeStep, setActiveStep] = useState(0);
  const [warnings, setWarnings] = useState(initialWarnings);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<{ error: string; needsLogin?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const pendingFocus = useRef<string | null>(null);

  const dirty = unsaved || JSON.stringify(form) !== baseline;
  const guard = useLeaveGuard(dirty && !saving);

  const issues = useMemo(() => validateForm(form), [form]);
  const error = (field: string) => (attempted ? issues.find((issue) => issue.field === field)?.message : undefined);

  const previewForm = useDeferredValue(form);
  const previewRecipe = useMemo(() => formToRecipe(previewForm), [previewForm]);
  const shownStep = Math.min(activeStep, Math.max(0, previewRecipe.steps.length - 1));

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  });

  const setForm = (update: (form: FormState) => FormState) => setFormState(update);
  const patch = (changes: Partial<FormState>) => setFormState((f) => ({ ...f, ...changes }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setFailure(null);
    if (issues.length) {
      document.getElementById(issues[0].field)?.focus();
      return;
    }
    guard.setBypass(true);
    startSaving(async () => {
      const result = await saveRecipe(formToInput(form), recipeId);
      guard.setBypass(false);
      setFailure(result);
    });
  }

  return (
    <form noValidate onSubmit={submit} aria-label={recipeId ? "Edit recipe" : "New recipe"}>
      {warnings.length > 0 && (
        <section aria-labelledby="warnings-heading" className="mb-8 border border-[var(--ink)] p-4">
          <div className="flex items-start gap-3">
            <h2 id="warnings-heading" className={`${sectionTitle} flex-1 text-xl`}>
              We weren&rsquo;t sure about these
            </h2>
            <button type="button" onClick={() => setWarnings([])} aria-label="Dismiss these notes" className={smallButton}>
              Dismiss
            </button>
          </div>
          <ul className="mt-2 list-disc pl-5 text-base">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <LivePreview recipe={previewRecipe} stepIndex={shownStep} />
        <div className="grid gap-8 lg:col-start-1 lg:row-start-1">
          <DetailsSection form={form} onChange={patch} error={error} />
          <IngredientsSection
            form={form}
            setForm={setForm}
            focusAfter={(id) => (pendingFocus.current = id)}
            error={error}
            removeIngredient={(id) => setFormState((f) => removeIngredient(f, id))}
          />
          <StepsSection
            form={form}
            setForm={setForm}
            activeStep={shownStep}
            setActiveStep={setActiveStep}
            focusAfter={(id) => (pendingFocus.current = id)}
            error={error}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-[var(--ink)] bg-white px-5 py-3 sm:-mx-6 sm:px-6">
        <div aria-live="polite" className="empty:hidden">
          {attempted && issues.length > 0 && (
            <p className={`mb-2 ${errorClass}`}>
              {issues.length === 1 ? "1 thing to fix before saving:" : `${issues.length} things to fix before saving:`}{" "}
              {issues[0].message}.
            </p>
          )}
          {failure && !failure.needsLogin && (
            <p role="alert" className={`mb-2 ${errorClass}`}>
              {failure.error}
            </p>
          )}
        </div>
        {failure?.needsLogin && (
          <div className="mb-3">
            <LoginPrompt message={failure.error} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : "Save recipe"}
          </button>
          {onStartOver && (
            <button type="button" className={linkButton} onClick={() => guard.ask(onStartOver)}>
              Start over
            </button>
          )}
          <Link href={recipeId ? `/recipes/${recipeId}` : "/my"} className={linkButton}>
            Cancel
          </Link>
          {dirty && <span className="label-caps">Unsaved changes</span>}
        </div>
      </div>

      <ConfirmDialog
        open={guard.open}
        title="Leave without saving?"
        confirmLabel="Leave without saving"
        cancelLabel="Keep editing"
        onConfirm={guard.leave}
        onCancel={guard.stay}
      >
        Your changes to this recipe have not been saved.
      </ConfirmDialog>
    </form>
  );
}
