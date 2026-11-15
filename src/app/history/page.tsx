import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatDuration } from "@/components/cook/format";
import { RATINGS } from "@/components/cook/ratings";
import { EmptyState } from "@/components/stats/EmptyState";
import { TechniqueChips } from "@/components/stats/Chips";
import { GuestNote } from "@/components/stats/GuestNote";
import { formatDate, formatTime } from "@/components/stats/format";
import { getViewer } from "@/lib/auth/viewer";
import { listSessionGroups, type SessionEntry } from "@/lib/sessions/queries";

export const metadata = { title: "History" };

const label = "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]";

function Heading({ children, count }: { children: string; count: number }) {
  return (
    <h2 className="mt-12 font-serif text-3xl font-semibold">
      {children} <span className="font-sans text-xl font-normal text-[var(--ink-soft)]">({count})</span>
    </h2>
  );
}

function Finished({ entry }: { entry: SessionEntry }) {
  const when = entry.finishedAt!;
  return (
    <li className="rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-4 shadow-[5px_5px_0_var(--ink)] sm:p-5">
      <p className="text-base text-[var(--ink-soft)]">
        <time dateTime={when.toISOString()}>
          {formatDate(when)}, {formatTime(when)}
        </time>
        {" · "}
        {formatDuration(entry.durationSeconds ?? 0)}
      </p>
      <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight">
        <Link href={`/history/${entry.id}`} className="underline-offset-4 hover:underline">
          {entry.recipe.title}
        </Link>
      </h3>
      <p className="mt-2 text-lg">
        {entry.rating ? `${RATINGS[entry.rating - 1]} (${entry.rating} of 5)` : "Not rated"}
      </p>
      {!entry.plausible && (
        <p className="mt-2 border-l-4 border-[var(--gold)] pl-3 text-base text-[var(--ink-soft)]">
          Walkthrough: faster than the timers allow, so it does not count towards your skills.
        </p>
      )}
      <div className="mt-3">
        <TechniqueChips techniques={entry.techniques} />
      </div>
      {entry.note && (
        <p className="mt-3 border-l-4 border-[var(--tomato)] pl-3 font-serif text-xl italic">{entry.note}</p>
      )}
    </li>
  );
}

function Unfinished({ entry, live }: { entry: SessionEntry; live: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-[var(--ink)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-xl font-semibold leading-tight">{entry.recipe.title}</p>
        <p className="text-base text-[var(--ink-soft)]">
          Started {formatDate(entry.startedAt)}, {formatTime(entry.startedAt)}
        </p>
      </div>
      {live && entry.recipeId ? (
        <Link
          href={`/cook/${entry.recipeId}`}
          className="rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-5 py-2 text-lg font-bold text-[var(--paper)]"
        >
          Back to cooking
        </Link>
      ) : (
        <Link href={`/history/${entry.id}`} className="text-lg font-semibold underline underline-offset-4">
          See what you did
        </Link>
      )}
    </li>
  );
}

export default async function HistoryPage() {
  const viewer = await getViewer();
  const { total, finished, inProgress, abandoned } = viewer
    ? await listSessionGroups(viewer.id)
    : { total: 0, finished: [], inProgress: [], abandoned: [] };

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-14">
        <p className={label}>History</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05]">What you have cooked</h1>
        {viewer?.isGuest && total > 0 && <GuestNote />}

        {total === 0 && (
          <EmptyState title="Nothing cooked yet">
            Finish a recipe and it shows up here, with how long each step took and what you wrote down.
          </EmptyState>
        )}

        {inProgress.length > 0 && (
          <>
            <Heading count={inProgress.length}>In progress</Heading>
            <ul className="mt-4 grid gap-3">
              {inProgress.map((e) => (
                <Unfinished key={e.id} entry={e} live />
              ))}
            </ul>
          </>
        )}

        {finished.length > 0 && (
          <>
            <Heading count={finished.length}>Finished</Heading>
            <ul className="mt-4 grid gap-6">
              {finished.map((e) => (
                <Finished key={e.id} entry={e} />
              ))}
            </ul>
          </>
        )}

        {abandoned.length > 0 && (
          <>
            <Heading count={abandoned.length}>Left unfinished</Heading>
            <ul className="mt-4 grid gap-3">
              {abandoned.map((e) => (
                <Unfinished key={e.id} entry={e} live={false} />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
