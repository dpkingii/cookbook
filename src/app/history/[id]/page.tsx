import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatClock, formatDuration } from "@/components/cook/format";
import { RATINGS } from "@/components/cook/ratings";
import { formatDate, formatTime } from "@/components/stats/format";
import { getViewer } from "@/lib/auth/viewer";
import { getSessionDetail } from "@/lib/sessions/queries";
import { buildTimeline, type TimelineTimer } from "@/lib/sessions/timeline";

export async function generateMetadata({ params }: PageProps<"/history/[id]">) {
  const viewer = await getViewer();
  const detail = viewer && (await getSessionDetail(viewer.id, (await params).id));
  return { title: detail ? `${detail.entry.recipe.title} · History` : "History" };
}

const clock = (seconds: number) => formatClock(seconds * 1000);

function timerLine(t: TimelineTimer) {
  const start = `started at ${clock(t.startedOffset)}`;
  if (t.outcome === "cancelled") return `${start}, cancelled${t.endedOffset === null ? "" : ` at ${clock(t.endedOffset)}`}`;
  if (t.outcome === "running") return `${start}, still running`;
  return `${start}, rang at ${clock(t.endedOffset ?? t.startedOffset + t.seconds)}`;
}

export default async function SessionPage({ params }: PageProps<"/history/[id]">) {
  const viewer = await getViewer();
  const detail = viewer && (await getSessionDetail(viewer.id, (await params).id));
  if (!detail) notFound();

  const { entry, events } = detail;
  const timeline = buildTimeline(entry.recipe, events);
  const longest = Math.max(1, ...timeline.steps.map((s) => s.spentSeconds));
  const total = timeline.steps.reduce((sum, s) => sum + s.spentSeconds, 0);

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-14">
        <Link href="/history" className="text-lg font-semibold underline underline-offset-4">
          All history
        </Link>
        <p className="mt-6 text-base text-[var(--ink-soft)]">
          <time dateTime={entry.startedAt.toISOString()}>
            {formatDate(entry.startedAt)}, {formatTime(entry.startedAt)}
          </time>
          {entry.finishedAt === null && " · not finished"}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{entry.recipe.title}</h1>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
          {[
            ["Time", formatDuration(entry.durationSeconds ?? total)],
            ["Recipe says", `${entry.recipe.prepMinutes + entry.recipe.cookMinutes} min`],
            ["Rating", entry.rating ? RATINGS[entry.rating - 1] : "None"],
          ].map(([term, value]) => (
            <div key={term} className="rounded-2xl border-2 border-[var(--ink)] p-3">
              <dt className="text-sm uppercase tracking-widest text-[var(--ink-soft)]">{term}</dt>
              <dd className="mt-1 font-serif text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {entry.note && (
          <p className="mt-6 border-l-4 border-[var(--tomato)] pl-3 font-serif text-2xl italic">{entry.note}</p>
        )}
        {entry.finishedAt && !entry.plausible && (
          <p className="mt-4 border-l-4 border-[var(--gold)] pl-3 text-lg text-[var(--ink-soft)]">
            Faster than the timers allow, so this walkthrough does not count towards your skills.
          </p>
        )}

        <h2 className="mt-12 font-serif text-3xl font-semibold">Step by step</h2>
        <p className="mt-1 text-lg text-[var(--ink-soft)]">
          Time on each step, not counting pauses
          {timeline.pausedSeconds > 0 && ` (paused for ${formatDuration(timeline.pausedSeconds)})`}.
        </p>
        <ol className="mt-6 grid gap-5">
          {timeline.steps.map((step) => {
            const timers = timeline.timers.filter((t) => t.stepIndex === step.index);
            return (
              <li key={step.index} className="rounded-2xl border-2 border-[var(--ink)] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
                    Step {step.index + 1} · {step.technique}
                  </p>
                  <p className="shrink-0 font-serif text-2xl font-semibold">
                    {step.reached ? formatDuration(step.spentSeconds) : "Not reached"}
                  </p>
                </div>
                <p className="mt-2 text-xl leading-snug">{step.text}</p>
                {step.reached && (
                  <div aria-hidden className="mt-3 h-3 rounded-full bg-[var(--paper-deep)]">
                    <div
                      className="h-3 rounded-full bg-[var(--tomato)]"
                      style={{ width: `${Math.max(2, (step.spentSeconds / longest) * 100)}%` }}
                    />
                  </div>
                )}
                {timers.length > 0 && (
                  <ul className="mt-3 grid gap-1 text-lg text-[var(--ink-soft)]">
                    {timers.map((t) => (
                      <li key={t.id}>
                        Timer: {t.label || "Timer"}, {formatDuration(t.seconds)}; {timerLine(t)}
                      </li>
                    ))}
                  </ul>
                )}
                {step.timerSeconds !== null && timers.length === 0 && step.reached && (
                  <p className="mt-3 text-lg text-[var(--ink-soft)]">
                    No timer started (recipe suggests {formatDuration(step.timerSeconds)}).
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {entry.recipeId && (
          <Link
            href={`/recipes/${entry.recipeId}`}
            className="mt-10 inline-block rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-6 py-3 text-xl font-bold shadow-[4px_4px_0_var(--ink)]"
          >
            Open the recipe
          </Link>
        )}
      </main>
    </div>
  );
}
