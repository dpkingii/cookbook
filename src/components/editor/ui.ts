const focus =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--gold)]";

export const inputClass = `min-h-11 w-full rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-2 text-lg text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 aria-[invalid=true]:border-[var(--tomato-deep)] aria-[invalid=true]:bg-[#fbe9e4] disabled:opacity-60 ${focus}`;

export const primaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-7 py-2.5 text-lg font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-70 ${focus}`;

export const secondaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--ink)] bg-transparent px-5 py-2 text-base font-semibold text-[var(--ink)] hover:bg-[var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;

export const iconButton = `inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30 ${focus}`;

export const panel =
  "rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-4 sm:p-6";

export const labelClass = "block text-base font-semibold";
