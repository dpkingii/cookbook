"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/recipes/actions";
import { secondaryButton } from "./ui";

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
      <button type="button" aria-pressed={on} onClick={toggle} className={`${secondaryButton} ${on ? "!bg-[var(--paper-deep)]" : ""}`}>
        <Heart aria-hidden size={20} className={on ? "fill-[var(--tomato)] text-[var(--tomato)]" : ""} />
        Favourite
      </button>
      <span role="alert" className="text-base font-semibold text-[var(--tomato-deep)] empty:hidden">
        {error}
      </span>
    </>
  );
}
