/** Shared class strings for the Cookbook look. See docs/design.md. */

const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export const buttonPrimary = `inline-flex min-h-12 items-center justify-center bg-[var(--ink)] px-6 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40 ${focus}`;

export const buttonGhost = `inline-flex min-h-12 items-center justify-center border border-[var(--rule)] bg-transparent px-4 text-base font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-40 ${focus}`;

export const textLink = `font-medium underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--ink)] ${focus}`;

export const input = `w-full border border-[var(--ink)] bg-white px-3 py-3 text-base text-[var(--ink)] placeholder:text-[var(--mute)] ${focus}`;

/** Recipe names, step text, page titles. */
export const display = "font-serif font-medium tracking-[-0.02em] text-[var(--ink)]";

/** Very large figures: session time, streak. */
export const figure = "font-serif font-medium leading-[0.92] tracking-[-0.04em] tabular-nums";

/** A row in a hairline list. */
export const listRow = "flex items-baseline justify-between gap-3 border-t border-[var(--rule)] py-3";

export const surface = "border border-[var(--rule)] bg-white";
