/** One earlier finished cook of a recipe, ready to hand to a client component. */
export interface PastCook {
  id: string;
  /** The day it was cooked, already in the viewer's time zone. */
  when: string;
  rating: number | null;
  note: string | null;
  photoVersion: number | null;
}

/** The most recent cook that left something to look back on. */
export const lastWith = <K extends "note" | "photoVersion">(cooks: readonly PastCook[], key: K) =>
  cooks.findLast((c) => c[key] !== null) as (PastCook & { [P in K]: NonNullable<PastCook[P]> }) | undefined;
