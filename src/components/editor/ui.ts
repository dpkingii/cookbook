import { buttonGhost, buttonPrimary, display, input, textLink } from "@/components/ui/styles";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  input,
  "min-h-11 aria-[invalid=true]:border-[var(--accent)] aria-[invalid=true]:outline-[var(--accent)] disabled:opacity-60",
);

export const primaryButton = cn(buttonPrimary, "gap-2 disabled:cursor-wait");

export const secondaryButton = cn(buttonGhost, "gap-2");

/** Small ghost button for reorder and remove controls; give it visible text. */
export const smallButton = cn(buttonGhost, "min-h-11 gap-1 px-3 text-sm");

export const linkButton = cn(textLink, "inline-flex min-h-11 items-center");

/** A section of the editor, set off from the one above by a hairline. */
export const section = "border-t border-[var(--rule)] pt-6";

export const sectionTitle = cn(display, "text-2xl");

export const labelClass = "block text-base font-medium";

export const hintClass = "text-sm text-[var(--mute)]";

export const errorClass = "text-sm font-medium text-[var(--accent)]";

export const checkbox = "size-5 shrink-0 accent-[var(--ink)]";
