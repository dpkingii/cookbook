"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { removeRecipe } from "@/lib/recipes/actions";
import { ConfirmDialog } from "./ConfirmDialog";
import { secondaryButton } from "./ui";

export function DeleteRecipe({ recipeId, title }: { recipeId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, startTransition] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${secondaryButton} !border-[var(--tomato-deep)] !text-[var(--tomato-deep)]`}>
        <Trash2 aria-hidden size={20} /> Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete this recipe?"
        confirmLabel="Delete recipe"
        cancelLabel="Keep recipe"
        busy={busy}
        error={error}
        onCancel={() => {
          setOpen(false);
          setError(undefined);
        }}
        onConfirm={() =>
          startTransition(async () => {
            const result = await removeRecipe(recipeId);
            setError(result.error);
          })
        }
      >
        &ldquo;{title}&rdquo; will be removed for good, including from anyone&rsquo;s favourites.
      </ConfirmDialog>
    </>
  );
}
