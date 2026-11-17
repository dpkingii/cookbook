import type { Recap } from "@/lib/stats/recap";
import { buttonGhost, figure, listRow } from "@/components/ui/styles";
import { Footer } from "./Footer";
import { NextOrDone } from "./NextOrDone";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function FinishWeek({
  streak,
  last,
  onNext,
  onBack,
}: {
  streak: Recap["streak"];
  last: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const cooked = streak.days.filter(Boolean).length;
  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">Your week</p>
        <h1 tabIndex={-1} className="sr-only outline-none">
          {streak.weeks} week streak
        </h1>
        <p aria-hidden className={`${figure} mt-8 text-7xl`}>
          {streak.weeks}
          <span className="ml-2 font-sans text-base font-medium tracking-normal text-[var(--mute)]">
            week streak
          </span>
        </p>

        <ul className="mt-8 grid grid-cols-7 gap-2" aria-label="Days cooked this week">
          {DAYS.map((day, i) => {
            const on = streak.days[i];
            const today = i === streak.todayIndex;
            return (
              <li key={day} className="grid justify-items-center gap-2">
                <span className="sr-only">
                  {day}
                  {today ? " (today)" : ""}: {on ? "cooked" : "not cooked"}
                </span>
                <span
                  aria-hidden
                  className={`grid aspect-square w-full place-items-center border-2 ${
                    today ? "border-[var(--ink)] bg-[var(--ink)] shadow-[3px_3px_0_var(--tomato)]" : on ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--rule)]"
                  }`}
                >
                  {on && (
                    <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="white" strokeWidth="2">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  )}
                </span>
                <span aria-hidden className={`label-caps ${today ? "!text-[var(--ink)]" : ""}`}>
                  {day[0]}
                </span>
              </li>
            );
          })}
        </ul>

        <div className={`${listRow} mt-8`}>
          <span className="label-caps">Days cooked</span>
          <span className="font-serif text-2xl font-medium tabular-nums">{cooked} of 7</span>
        </div>
        <p className="border-t border-[var(--rule)] pt-3 text-base">
          Cook once next week and the streak becomes {streak.weeks + 1} {streak.weeks + 1 === 1 ? "week" : "weeks"}.
        </p>
      </div>

      <Footer>
        <button type="button" onClick={onBack} className={buttonGhost}>
          Back
        </button>
        <NextOrDone last={last} onNext={onNext} />
      </Footer>
    </>
  );
}
