"use client";

import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { importFromText, importFromUrl } from "@/lib/recipes/actions";
import type { RecipeDraft } from "@/lib/import";
import { Field } from "./Field";
import { inputClass, panel, primaryButton } from "./ui";

const SAMPLE = `Garlic noodles

Serves 2

Ingredients
200 g spaghetti
4 cloves garlic, minced
2 tbsp butter
1 tbsp soy sauce
2 scallions, sliced

Method
1. Boil the spaghetti in salted water for 9 minutes, then drain.
2. Melt the butter over medium heat and fry the garlic for 1 minute.
3. Toss the noodles with the garlic butter and soy sauce.
4. Serve topped with scallions.`;

const TABS = [
  { id: "text", label: "Paste a recipe" },
  { id: "url", label: "From a link" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ImportPanel({ onDraft, onScratch }: { onDraft: (draft: RecipeDraft) => void; onScratch: () => void }) {
  const uid = useId();
  const [tab, setTab] = useState<TabId>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ text: null, url: null });

  function run(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startBusy(async () => {
      const result = tab === "text" ? await importFromText(text) : await importFromUrl(url);
      if ("error" in result) setError(result.error);
      else onDraft(result.draft);
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = tab === "text" ? "url" : "text";
    setTab(next);
    setError(null);
    tabRefs.current[next]?.focus();
    event.preventDefault();
  }

  return (
    <div className={panel}>
      <div role="tablist" aria-label="How to add a recipe" className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`${uid}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={`min-h-11 rounded-full border-2 border-[var(--ink)] px-5 py-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--gold)] ${
              tab === t.id ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={run}
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${tab}`}
        className="mt-5 grid gap-4"
      >
        {tab === "text" ? (
          <Field
            id="import-text"
            label="Recipe text"
            hint="Paste the ingredients and the method from anywhere. We sort out the steps."
            error={error ?? undefined}
          >
            {(props) => (
              <textarea
                {...props}
                rows={14}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={SAMPLE}
                className={`${inputClass} font-mono !text-base`}
              />
            )}
          </Field>
        ) : (
          <Field
            id="import-url"
            label="Recipe link"
            hint="Works with most recipe sites. If a page will not import, paste its text instead."
            error={error ?? undefined}
          >
            {(props) => (
              <input
                {...props}
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/garlic-noodles"
                className={inputClass}
              />
            )}
          </Field>
        )}
        <div aria-live="polite" className="sr-only">
          {busy ? "Reading the recipe" : ""}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Reading the recipe…" : tab === "text" ? "Turn into steps" : "Fetch recipe"}
          </button>
          <button
            type="button"
            onClick={onScratch}
            className="min-h-11 text-lg font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--gold)]"
          >
            Start from scratch
          </button>
        </div>
      </form>
    </div>
  );
}
