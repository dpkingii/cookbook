"use client";

import { useEffect, useRef } from "react";
import { buttonPrimary, input } from "@/components/ui/styles";

/** Focuses itself only where there is a keyboard and mouse, so a phone's keyboard does not cover the page. */
export function SearchField({ defaultValue }: { defaultValue?: string }) {
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) field.current?.focus();
  }, []);

  return (
    <form action="/cook" role="search" className="flex gap-2">
      <input
        ref={field}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Recipe or ingredient"
        aria-label="Search recipes or ingredients"
        autoComplete="off"
        className={`${input} min-h-12 min-w-0 flex-1`}
      />
      <button type="submit" className={buttonPrimary}>
        Search
      </button>
    </form>
  );
}
