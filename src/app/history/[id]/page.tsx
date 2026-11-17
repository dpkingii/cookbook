import Link from "next/link";
import { notFound } from "next/navigation";
import { formatClock, formatDuration } from "@/components/cook/format";
import { RATINGS } from "@/components/cook/ratings";
import { AppShell } from "@/components/site/AppShell";
import { BackLink } from "@/components/site/BackLink";
import { DishPhoto } from "@/components/photo/DishPhoto";
import { formatDate, formatTime } from "@/components/stats/format";
import { TECHNIQUE_NOTES } from "@/lib/recipe/technique-notes";
import { viewerTimeZone } from "@/lib/stats/viewer-time-zone";
import { buttonGhost } from "@/components/ui/styles";
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
  const tz = await viewerTimeZone();
  const timeline = buildTimeline(entry.recipe, events);
  const longest = Math.max(1, ...timeline.steps.map((s) => s.spentSeconds));
  const total = timeline.steps.reduce((sum, s) => sum + s.spentSeconds, 0);

  return (
    <AppShell tone="sky" reading>
      <BackLink />
      <p className="label-caps mt-2">
        <time dateTime={entry.startedAt.toISOString()}>
          {formatDate(entry.startedAt, tz)}, {formatTime(entry.startedAt, tz)}
        </time>
        {entry.finishedAt === null && " · not finished"}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">{entry.recipe.title}</h1>

      {entry.finishedAt && <DishPhoto sessionId={entry.id} version={entry.photoVersion} title={entry.recipe.title} />}

      <dl className="mt-6 grid grid-cols-3 border-y border-[var(--rule)] py-4">
        {[
          ["Time", formatDuration(entry.durationSeconds ?? total)],
          ["Recipe says", `${entry.recipe.prepMinutes + entry.recipe.cookMinutes} min`],
          ["Rating", entry.rating ? RATINGS[entry.rating - 1] : "None"],
        ].map(([term, value]) => (
          <div key={term}>
            <dt className="label-caps">{term}</dt>
            <dd className="mt-1 font-serif text-xl font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {entry.note && <p className="mt-6 border-l border-[var(--ink)] pl-3 font-serif text-xl italic">{entry.note}</p>}
      {entry.finishedAt && !entry.plausible && (
        <p className="mt-4 text-sm text-[var(--mute)]">
          Faster than the timers allow, so this walkthrough does not count towards your skills.
        </p>
      )}

      <section aria-labelledby="steps" className="mt-10">
        <h2 id="steps" className="label-caps">
          Step by step
        </h2>
        <p className="mt-1 text-sm text-[var(--mute)]">
          Time on each step, not counting pauses
          {timeline.pausedSeconds > 0 && ` (paused for ${formatDuration(timeline.pausedSeconds)})`}.
        </p>
        <ol className="mt-3 border-b border-[var(--rule)]">
          {timeline.steps.map((step) => {
            const timers = timeline.timers.filter((t) => t.stepIndex === step.index);
            return (
              <li key={step.index} className="border-t border-[var(--rule)] py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="label-caps">
                    Step {step.index + 1} · {TECHNIQUE_NOTES[step.technique].name}
                  </p>
                  <p className="shrink-0 font-serif text-xl font-medium tabular-nums">
                    {step.reached ? formatDuration(step.spentSeconds) : "Not reached"}
                  </p>
                </div>
                <p className="mt-2 text-base leading-snug">{step.text}</p>
                {step.reached && (
                  <div aria-hidden className="mt-3 h-1 bg-[var(--rule)]">
                    <div
                      className="h-1 bg-[var(--ink)]"
                      style={{ width: `${Math.max(2, (step.spentSeconds / longest) * 100)}%` }}
                    />
                  </div>
                )}
                {timers.length > 0 && (
                  <ul className="mt-3 grid gap-1 text-sm text-[var(--mute)]">
                    {timers.map((t) => (
                      <li key={t.id}>
                        Timer: {t.label || "Timer"}, {formatDuration(t.seconds)}; {timerLine(t)}
                      </li>
                    ))}
                  </ul>
                )}
                {step.timerSeconds !== null && timers.length === 0 && step.reached && (
                  <p className="mt-3 text-sm text-[var(--mute)]">
                    No timer started (recipe suggests {formatDuration(step.timerSeconds)}).
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {entry.recipeId && (
          <Link href={`/recipes/${entry.recipeId}`} className={buttonGhost}>
            Open the recipe
          </Link>
        )}
        <Link href="/history" className={buttonGhost}>
          All history
        </Link>
      </div>
    </AppShell>
  );
}
