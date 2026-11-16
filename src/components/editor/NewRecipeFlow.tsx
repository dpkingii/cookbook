"use client";

import { useState } from "react";
import { textLink } from "@/components/ui/styles";
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
        <p className="mb-6 max-w-xl border-l-2 border-[var(--ink)] pl-3 text-base text-[var(--mute)]">
          You can try this without an account. To keep the recipe you will need to{" "}
          <a href="/login" target="_blank" className={textLink}>
            log in
          </a>{" "}
          or{" "}
          <a href="/signup" target="_blank" className={textLink}>
            sign up
          </a>
          .
        </p>
      )}
      {stage.kind === "import" ? (
        <div className="max-w-xl">
          <ImportPanel
            onDraft={(draft: RecipeDraft) => {
              const { warnings, ...recipe } = draft;
              setStage({ kind: "draft", recipe, warnings });
            }}
            onScratch={() => setStage({ kind: "scratch" })}
          />
        </div>
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
