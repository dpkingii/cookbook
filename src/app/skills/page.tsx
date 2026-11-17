import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { BackLink } from "@/components/site/BackLink";
import { ring } from "@/components/site/focus";
import { EmptyState } from "@/components/stats/EmptyState";
import { GuestNote } from "@/components/stats/GuestNote";
import { formatCompact, formatMinutes, plural } from "@/components/stats/format";
import { StatTiles } from "@/components/stats/StatTiles";
import { getViewer } from "@/lib/auth/viewer";
import { listCatalogueTechniques } from "@/lib/db/browse";
import { listSessions, toFinished } from "@/lib/sessions/queries";
import {
  cuisineProficiency,
  nextUp,
  pace,
  TOP_LEVEL_POINTS,
  techniqueCounts,
  techniqueMap,
  totals,
  weeklyStreak,
  type FinishedSession,
} from "@/lib/stats";
import { TECHNIQUE_NOTES } from "@/lib/recipe/technique-notes";
import { TECHNIQUES } from "@/lib/recipe/types";
import { viewerTimeZone } from "@/lib/stats/viewer-time-zone";

export const metadata = { title: "Skills" };

const STATION_LABEL = {
  board: "Cutting board",
  bowl: "Mixing bowl",
  pan: "Pan",
  pot: "Pot",
  oven: "Oven",
  rest: "Resting and plating",
} as const;

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="font-serif text-2xl font-medium">
        {title}
      </h2>
      {note && <p className="mt-1 text-sm text-[var(--mute)]">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TechniqueMap({ sessions }: { sessions: FinishedSession[] }) {
  const tried = techniqueCounts(sessions).filter((t) => t.count > 0).length;
  return (
    <Section
      id="map"
      title="Technique map"
      note={`${tried} of ${TECHNIQUES.length} techniques practised. Dark names are ones you have cooked; light ones are still ahead.`}
    >
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8">
        {techniqueMap(sessions).map(({ station, techniques }) => (
          <section key={station} aria-labelledby={`st-${station}`}>
            <h3 id={`st-${station}`} className="label-caps mb-2">
              {STATION_LABEL[station]}
            </h3>
            <ul className="grid grid-cols-2 border-l border-t border-[var(--rule)]">
              {techniques.map(({ technique, count }) => (
                <li
                  key={technique}
                  className={`flex min-h-12 items-baseline justify-between gap-2 border-b border-r border-[var(--rule)] px-3 py-3 ${
                    count > 0 ? "text-[var(--ink)]" : "text-[var(--mute)]"
                  }`}
                >
                  <span className="text-base">{TECHNIQUE_NOTES[technique].name}</span>
                  <span className="text-sm tabular-nums">{count > 0 ? plural(count, "cook") : "not yet"}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
}

function Cuisines({ sessions }: { sessions: FinishedSession[] }) {
  const rows = cuisineProficiency(sessions);
  const top = Math.max(TOP_LEVEL_POINTS, ...rows.map((r) => r.points));
  return (
    <Section
      id="cuisines"
      title="Cuisines"
      note={`Each cook earns points for its cuisine: easy 1, medium 2, hard 3. A full bar is ${TOP_LEVEL_POINTS} points, Fluent.`}
    >
      {rows.length === 0 ? (
        <p className="text-base">No cuisine yet.</p>
      ) : (
        <ul className="border-b border-[var(--rule)]">
          {rows.map((r) => (
            <li key={r.cuisine} className="border-t border-[var(--rule)] py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-serif text-xl font-medium">{r.cuisine}</p>
                <p className="text-base font-medium">{r.level}</p>
              </div>
              <div aria-hidden className="mt-2 h-1 bg-[var(--rule)]">
                <div className="h-1 bg-[var(--ink)]" style={{ width: `${(r.points / top) * 100}%` }} />
              </div>
              <p className="mt-2 text-sm text-[var(--mute)]">
                {plural(r.points, "point")} from {plural(r.sessions, "cook")}
                {r.nextLevel && `; ${plural(r.pointsToNext!, "more point")} to ${r.nextLevel}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Pace({ sessions }: { sessions: FinishedSession[] }) {
  const { entries, overallRatio } = pace(sessions);
  const shown = entries.slice(0, 6);
  const scale = Math.max(1, ...shown.flatMap((e) => [e.actualMinutes, e.plannedMinutes]));
  return (
    <Section
      id="pace"
      title="Pace"
      note={
        overallRatio === null
          ? "Finish a cook to see how you compare with the recipe."
          : `Over all your cooks you take ${Math.round(overallRatio * 100)}% of the time the recipes suggest (prep plus cook).`
      }
    >
      <ul className="border-b border-[var(--rule)]">
        {shown.map((e) => (
          <li key={e.id} className="border-t border-[var(--rule)] py-4">
            <p className="text-base font-medium">{e.title}</p>
            <div className="mt-2 grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-[var(--mute)]">You</span>
              <span
                aria-hidden
                className="h-2 bg-[var(--ink)]"
                style={{
                  width: `${Math.max(1, (e.actualMinutes / scale) * 100)}%`,
                }}
              />
              <span className="text-right tabular-nums">{formatMinutes(e.actualMinutes)}</span>
              <span className="text-[var(--mute)]">Recipe</span>
              <span
                aria-hidden
                className="h-2 border border-[var(--ink)]"
                style={{
                  width: `${Math.max(1, (e.plannedMinutes / scale) * 100)}%`,
                }}
              />
              <span className="text-right tabular-nums">{formatMinutes(e.plannedMinutes)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default async function SkillsPage() {
  const viewer = await getViewer();
  const entries = viewer ? await listSessions(viewer.id) : [];
  const finished = entries.map(toFinished).filter((s) => s !== null);

  const catalogue = finished.length > 0 ? await listCatalogueTechniques(viewer!.id) : [];
  const now = new Date();
  const sum = totals(finished);
  const streak = weeklyStreak(finished, now, await viewerTimeZone());
  const upNext = nextUp(finished, catalogue);
  const skipped = finished.filter((s) => !s.plausible).length;

  return (
    <AppShell tone="mint">
      <BackLink />
      <p className="label-caps mt-2">Skills</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">What your hands know</h1>
      {viewer?.isGuest && finished.length > 0 && <GuestNote />}

      {finished.length === 0 ? (
        <EmptyState title="Nothing cooked yet">
          Finish a recipe and your techniques, cuisines and streak start filling in here.
        </EmptyState>
      ) : (
        <>
          <div className="mt-6">
            <StatTiles
              tiles={[
                { label: "Cooks", value: String(sum.sessions) },
                {
                  label: "Recipes",
                  value: String(sum.recipes),
                  unit: "different",
                },
                {
                  label: "At the stove",
                  value: formatCompact(sum.totalSeconds),
                },
                {
                  label: "Weekly streak",
                  value: String(streak.current),
                  unit: streak.current === 1 ? "week" : "weeks",
                },
              ]}
            />
            <p className="mt-3 text-sm text-[var(--mute)]">
              Best ever: {plural(streak.longest, "week")}
              {streak.current > 0 && !streak.activeThisWeek && ". Cook this week to keep your streak."}
            </p>
          </div>

          <TechniqueMap sessions={finished} />
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
            <Cuisines sessions={finished} />
            <Pace sessions={finished} />
          </div>

          <Section
            id="next"
            title="Next up"
            note={
              upNext.length === 0
                ? "You have practised every technique the catalogue uses."
                : "Recipes that teach you something you have not tried."
            }
          >
            <ul className="border-b border-[var(--rule)]">
              {upNext.map(({ recipe, newTechniques }) => (
                <li key={recipe.id} className="border-t border-[var(--rule)]">
                  <Link href={`/recipes/${recipe.id}`} className={`group block min-h-16 py-3 ${ring}`}>
                    <span className="block font-serif text-xl font-medium leading-snug group-hover:underline group-hover:decoration-[var(--rule)] group-hover:underline-offset-4">
                      {recipe.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--mute)]">
                      {recipe.cuisine} · {recipe.difficulty} · New: {newTechniques.map((t) => TECHNIQUE_NOTES[t].name).join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          {skipped > 0 && (
            <p className="mt-10 text-sm text-[var(--mute)]">
              {plural(skipped, "cook")} left out: finished faster than the timers allow, so{" "}
              {skipped === 1 ? "it reads" : "they read"} as a walkthrough.
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}
