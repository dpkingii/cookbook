const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Seven boxes, Monday to Sunday. Cooked days are ink with a white check; today is the white box with a shadow. */
export function WeekBoxes({ cooked, today }: { cooked: readonly boolean[]; today: number | null }) {
  return (
    <ol aria-label="This week" className="grid grid-cols-7 gap-2">
      {DAYS.map((day, i) => {
        const done = cooked[i] === true;
        const now = i === today;
        const box = now
          ? done
            ? "border-[var(--ink)] bg-[var(--ink)] shadow-[3px_3px_0_var(--tomato)]"
            : "border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--tomato)]"
          : done
            ? "border-[var(--ink)] bg-[var(--ink)]"
            : "border-[var(--rule)]";
        return (
          <li key={day} className="flex flex-col items-center gap-2">
            <span className={`grid aspect-square w-full max-w-12 place-items-center border-2 ${box}`}>
              {done && (
                <svg viewBox="0 0 24 24" aria-hidden className="size-1/2 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              )}
            </span>
            <span className={`label-caps ${now ? "!text-[var(--ink)] underline decoration-2 underline-offset-4" : ""}`} aria-hidden>
              {day[0]}
            </span>
            <span className="sr-only">
              {day}
              {now ? ", today" : ""}: {done ? "cooked" : "not cooked"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
