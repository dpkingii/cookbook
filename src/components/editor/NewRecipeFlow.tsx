"use client";

import { useState } from "react";
import type { RecipeDraft } from "@/lib/import";
import type { EditableRecipe } from "@/lib/recipes/form";
import { ImportPanel } from "./ImportPanel";
import { RecipeEditor } from "./RecipeEditor";

type Stage = { kind: "import" } | { kind: "draft"; recipe: EditableRecipe; warnings: string[] } | { kind: "scratch" };

export function NewRecipeFlow({ canSave }: { canSave: boolean }) {
  const [stage, setStage] = useState<Stage>({ kind: "import" });
  const [round, setRound] = useState(0);
  const startOver = () => {
    setStage({ kind: "import" });
    setRound((n) => n + 1);
  };

  return (
    <>
      {!canSave && (
        <p className="mb-6 max-w-2xl border-l-4 border-[var(--gold)] pl-3 text-lg text-[var(--ink-soft)]">
          You can try this without an account. To keep the recipe you will need to{" "}
          <a href="/login" target="_blank" className="font-semibold text-[var(--ink)] underline underline-offset-4">
            log in
          </a>{" "}
          or{" "}
          <a href="/signup" target="_blank" className="font-semibold text-[var(--ink)] underline underline-offset-4">
            sign up
          </a>
          .
        </p>
      )}
      {stage.kind === "import" ? (
        <ImportPanel
          onDraft={(draft: RecipeDraft) => {
            const { warnings, ...recipe } = draft;
            setStage({ kind: "draft", recipe, warnings });
          }}
          onScratch={() => setStage({ kind: "scratch" })}
        />
      ) : (
        <RecipeEditor
          key={round}
          initial={stage.kind === "draft" ? stage.recipe : undefined}
          warnings={stage.kind === "draft" ? stage.warnings : []}
          unsaved={stage.kind === "draft"}
          onStartOver={startOver}
        />
      )}
    </>
  );
}
