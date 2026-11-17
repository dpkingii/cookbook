/** Shared class strings for the Cookbook look. See docs/design.md. */

const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]";
const press =
  "transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0";

export const buttonPrimary = `inline-flex min-h-12 items-center justify-center border-2 border-[var(--ink)] bg-[var(--ink)] px-6 text-base font-semibold text-white shadow-[4px_4px_0_var(--rule)] hover:shadow-[6px_6px_0_var(--rule)] ${press} ${focus}`;

export const buttonGhost = `inline-flex min-h-12 items-center justify-center border-2 border-[var(--ink)] bg-white px-4 text-base font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] hover:shadow-[5px_5px_0_var(--ink)] ${press} ${focus}`;

export const textLink = `font-semibold underline decoration-[var(--ink)] decoration-2 underline-offset-4 hover:decoration-4 ${focus}`;

export const input = `w-full border-2 border-[var(--ink)] bg-white px-3 py-3 text-base text-[var(--ink)] placeholder:text-[var(--mute)] ${focus}`;

/** Recipe names, step text, page titles. */
export const display = "font-serif font-medium tracking-[-0.02em] text-[var(--ink)]";

/** Very large figures: session time, streak. */
export const figure = "font-serif font-medium leading-[0.92] tracking-[-0.04em] tabular-nums";

/** A row in a hairline list. */
export const listRow = "flex items-baseline justify-between gap-3 border-t border-[var(--rule)] py-3";

export const surface = "sheet";
