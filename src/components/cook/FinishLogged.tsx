"use client";

import Link from "next/link";
import type { Recap } from "@/lib/stats/recap";
import { buttonPrimary, figure, listRow } from "@/components/ui/styles";
import { Footer } from "./Footer";
import { formatMinutes, ordinal } from "./format";
import type { RecapState } from "./useRecap";
import { useCountUp } from "./useCountUp";

export interface LocalSummary {
  title: string;
  seconds: number;
  plausible: boolean;
  techniques: string[];
}

const amountOf = (seconds: number) =>
  seconds < 60 ? { value: seconds, unit: seconds === 1 ? "second" : "seconds" } : { value: Math.round(seconds / 60), unit: Math.round(seconds / 60) === 1 ? "minute" : "minutes" };

function Total({ label, before, after, accent }: { label: string; before: number; after: number; accent?: boolean }) {
  const shown = useCountUp(before, after);
  const delta = after - before;
  return (
    <div className={listRow + " flex-col !items-stretch gap-0"}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-caps">{label}</span>
        {delta > 0 && (
          <span className={`text-sm font-semibold tabular-nums ${accent ? "text-[var(--accent)]" : "text-[var(--mute)]"}`}>
            +{formatMinutes(delta)}
          </span>
        )}
      </div>
      <span className="font-serif text-2xl font-medium tabular-nums">
        {formatMinutes(shown)}
      </span>
    </div>
  );
}

function Rows({ recap }: { recap: Recap }) {
  return (
    <div className="mt-8">
      <Total label="Today" before={recap.today.before} after={recap.today.after} accent />
      <Total label="This week" before={recap.week.before} after={recap.week.after} />
      <div className={listRow + " border-b"}>
        <span className="label-caps">Session</span>
        <span className="text-base tabular-nums">
          {ordinal(recap.nth.today!)} today · {ordinal(recap.nth.week!)} this week
        </span>
      </div>
    </div>
  );
}

export function FinishLogged({
  local,
  recap,
  onNext,
}: {
  local: LocalSummary;
  recap: RecapState;
  onNext: () => void;
}) {
  const ready = recap.status === "ready" ? recap.recap : null;
  const seconds = ready?.session.seconds ?? local.seconds;
  const plausible = ready?.session.plausible ?? local.plausible;
  const { value, unit } = amountOf(seconds);

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">Session logged</p>
        <h1 tabIndex={-1} className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] outline-none">
          {local.title}
        </h1>
        <p className={`${figure} mt-8 text-7xl`}>
          {value}
          <span className="ml-2 font-sans text-base font-medium tracking-normal text-[var(--mute)]">{unit}</span>
        </p>

        {!plausible && (
          <p className="mt-6 text-lg">
            That was faster than the timers allow, so this one reads as a walkthrough. It is not counted in your totals.
          </p>
        )}
        {ready && plausible && <Rows recap={ready} />}
        {recap.status === "loading" && (
          <p role="status" className="mt-8 border-t border-[var(--rule)] pt-3 text-base text-[var(--mute)]">
            Adding it up…
          </p>
        )}
        {recap.status === "offline" && (
          <div role="status" className="mt-8 border-t border-[var(--rule)] pt-3">
            {local.plausible && local.techniques.length > 0 && (
              <div>
                <p className="label-caps">Practised</p>
                <p className="mt-1 text-base capitalize">{local.techniques.join(", ")}</p>
              </div>
            )}
            <p className="mt-2 text-base text-[var(--mute)]">
              The rest of your recap, your totals, week and next recipe, will appear once you are back online.
            </p>
          </div>
        )}
      </div>

      <Footer>
        {recap.status === "offline" ? (
          <Link href="/" className={`${buttonPrimary} flex-1`}>
            Back to recipes
          </Link>
        ) : (
          <button type="button" onClick={onNext} disabled={recap.status === "loading"} className={`${buttonPrimary} flex-1`}>
            Next
          </button>
        )}
      </Footer>
    </>
  );
}
