import Link from "next/link";
import { formatDuration } from "@/components/cook/format";
import { RATINGS } from "@/components/cook/ratings";
import { AppShell } from "@/components/site/AppShell";
import { BackLink } from "@/components/site/BackLink";
import { ring } from "@/components/site/focus";
import { TechniqueChips } from "@/components/stats/Chips";
import { EmptyState } from "@/components/stats/EmptyState";
import { GuestNote } from "@/components/stats/GuestNote";
import { formatDate, formatTime } from "@/components/stats/format";
import { buttonGhost } from "@/components/ui/styles";
import { getViewer } from "@/lib/auth/viewer";
import { viewerTimeZone } from "@/lib/stats/viewer-time-zone";
import { listSessionGroups, type SessionEntry } from "@/lib/sessions/queries";

export const metadata = { title: "History" };

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="label-caps mb-2">
        {title} · {count}
      </h2>
      <ul className="border-b border-[var(--rule)]">{children}</ul>
    </section>
  );
}

function Finished({ entry, tz }: { entry: SessionEntry; tz: string }) {
  const when = entry.startedAt;
  return (
    <li className="border-t border-[var(--rule)] py-4">
      <p className="text-sm text-[var(--mute)]">
        <time dateTime={when.toISOString()}>
          {formatDate(when, tz)}, {formatTime(when, tz)}
        </time>
        {" · "}
        {formatDuration(entry.durationSeconds ?? 0)}
      </p>
      <h3 className="mt-1 font-serif text-xl font-medium leading-snug">
        <Link href={`/history/${entry.id}`} className={`inline-block py-1 hover:underline hover:decoration-[var(--rule)] hover:underline-offset-4 ${ring}`}>
          {entry.recipe.title}
        </Link>
      </h3>
      <p className="text-base">{entry.rating ? `${RATINGS[entry.rating - 1]} (${entry.rating} of 5)` : "Not rated"}</p>
      {!entry.plausible && (
        <p className="mt-2 text-sm text-[var(--mute)]">
          Walkthrough: faster than the timers allow, so it does not count towards your skills.
        </p>
      )}
      <div className="mt-2">
        <TechniqueChips techniques={entry.techniques} />
      </div>
      {entry.note && <p className="mt-3 border-l border-[var(--ink)] pl-3 font-serif text-lg italic">{entry.note}</p>}
    </li>
  );
}

function Unfinished({ entry, live, tz }: { entry: SessionEntry; live: boolean; tz: string }) {
  const resume = live && entry.recipeId;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--rule)] py-3">
      <div className="min-w-0">
        <p className="font-serif text-xl font-medium leading-snug">{entry.recipe.title}</p>
        <p className="text-sm text-[var(--mute)]">
          Started {formatDate(entry.startedAt, tz)}, {formatTime(entry.startedAt, tz)}
        </p>
      </div>
      <Link href={resume ? `/cook/${entry.recipeId}` : `/history/${entry.id}`} className={buttonGhost}>
        {resume ? "Back to cooking" : "See what you did"}
      </Link>
    </li>
  );
}

export default async function HistoryPage() {
  const viewer = await getViewer();
  const tz = await viewerTimeZone();
  const { total, finished, inProgress, abandoned } = viewer
    ? await listSessionGroups(viewer.id)
    : { total: 0, finished: [], inProgress: [], abandoned: [] };

  return (
    <AppShell>
      <BackLink />
      <p className="label-caps mt-2">History</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">What you have cooked</h1>
      {viewer?.isGuest && total > 0 && <GuestNote />}

      {total === 0 && (
        <EmptyState title="Nothing cooked yet">
          Finish a recipe and it shows up here, with how long each step took and what you wrote down.
        </EmptyState>
      )}

      {inProgress.length > 0 && (
        <Section id="progress" title="In progress" count={inProgress.length}>
          {inProgress.map((e) => (
            <Unfinished key={e.id} entry={e} live tz={tz} />
          ))}
        </Section>
      )}
      {finished.length > 0 && (
        <Section id="finished" title="Finished" count={finished.length}>
          {finished.map((e) => (
            <Finished key={e.id} entry={e} tz={tz} />
          ))}
        </Section>
      )}
      {abandoned.length > 0 && (
        <Section id="abandoned" title="Left unfinished" count={abandoned.length}>
          {abandoned.map((e) => (
            <Unfinished key={e.id} entry={e} live={false} tz={tz} />
          ))}
        </Section>
      )}
    </AppShell>
  );
}
