"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/lib/recipes/actions";
import { errorClass, secondaryButton } from "./ui";

export function FavoriteButton({ recipeId, initial }: { recipeId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleFavorite(recipeId, next);
      if ("error" in result) {
        setOn(!next);
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        onClick={toggle}
        className={cn(secondaryButton, on && "border-[var(--ink)]")}
      >
        <Heart aria-hidden size={18} className={on ? "fill-[var(--ink)]" : ""} />
        Favourite
      </button>
      <span role="alert" className={`${errorClass} empty:hidden`}>
        {error}
      </span>
    </>
  );
}
