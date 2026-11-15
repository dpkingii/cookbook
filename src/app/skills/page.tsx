import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { EmptyState } from "@/components/stats/EmptyState";
import { GuestNote } from "@/components/stats/GuestNote";
import { formatMinutes, plural } from "@/components/stats/format";
import { getViewer } from "@/lib/auth/viewer";
import { listRecipes } from "@/lib/db/recipes";
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

export const metadata = { title: "Skills" };

const STATION_LABEL = {
  board: "Cutting board",
  bowl: "Mixing bowl",
  pan: "Pan",
  pot: "Pot",
  oven: "Oven",
  rest: "Resting and plating",
} as const;

const kicker = "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]";
const h2 = "mt-14 font-serif text-3xl font-semibold leading-tight";

function Tile({ term, value, note }: { term: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--ink)] p-3 sm:p-4">
      <dt className="text-sm uppercase tracking-widest text-[var(--ink-soft)]">{term}</dt>
      <dd className="mt-1 font-serif text-3xl font-semibold">{value}</dd>
      {note && <dd className="mt-1 text-base text-[var(--ink-soft)]">{note}</dd>}
    </div>
  );
}

function TechniqueMap({ sessions }: { sessions: FinishedSession[] }) {
  const groups = techniqueMap(sessions);
  const tried = techniqueCounts(sessions).filter((t) => t.count > 0).length;
  return (
    <section aria-labelledby="map">
      <h2 id="map" className={h2}>
        Technique map
      </h2>
      <p className="mt-2 text-xl text-[var(--ink-soft)]">
        {tried} of 20 techniques practised. Filled tiles are ones you have cooked; dashed tiles are still ahead.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {groups.map(({ station, techniques }) => (
          <section key={station} aria-labelledby={`st-${station}`}>
            <h3 id={`st-${station}`} className="text-lg font-semibold">
              {STATION_LABEL[station]}
            </h3>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {techniques.map(({ technique, count }) => (
                <li
                  key={technique}
                  className={`rounded-2xl border-2 px-3 py-2 ${
                    count > 0
                      ? "border-[var(--ink)] bg-[var(--gold)]"
                      : "border-dashed border-[var(--ink-soft)] text-[var(--ink-soft)]"
                  }`}
                >
                  <p className="text-xl font-semibold capitalize">{technique}</p>
                  <p className="text-base">{count > 0 ? plural(count, "cook") : "not yet"}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function Cuisines({ sessions }: { sessions: FinishedSession[] }) {
  const rows = cuisineProficiency(sessions);
  const top = Math.max(TOP_LEVEL_POINTS, ...rows.map((r) => r.points));
  return (
    <section aria-labelledby="cuisines">
      <h2 id="cuisines" className={h2}>
        Cuisines
      </h2>
      <p className="mt-2 text-xl text-[var(--ink-soft)]">
        Each cook earns points for its cuisine: easy 1, medium 2, hard 3. A full bar is {TOP_LEVEL_POINTS} points, Fluent.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-xl">No cuisine yet.</p>
      ) : (
        <ul className="mt-6 grid gap-5">
          {rows.map((r) => (
            <li key={r.cuisine}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-serif text-2xl font-semibold">{r.cuisine}</p>
                <p className="text-xl font-semibold">{r.level}</p>
              </div>
              <div aria-hidden className="mt-1 h-4 rounded-full bg-[var(--paper-deep)]">
                <div className="h-4 rounded-full bg-[var(--ink)]" style={{ width: `${(r.points / top) * 100}%` }} />
              </div>
              <p className="mt-1 text-base text-[var(--ink-soft)]">
                {plural(r.points, "point")} from {plural(r.sessions, "cook")}
                {r.nextLevel && `; ${plural(r.pointsToNext!, "more point")} to ${r.nextLevel}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Pace({ sessions }: { sessions: FinishedSession[] }) {
  const { entries, overallRatio } = pace(sessions);
  const shown = entries.slice(0, 6);
  const scale = Math.max(1, ...shown.flatMap((e) => [e.actualMinutes, e.plannedMinutes]));
  return (
    <section aria-labelledby="pace">
      <h2 id="pace" className={h2}>
        Pace
      </h2>
      {overallRatio === null ? (
        <p className="mt-2 text-xl text-[var(--ink-soft)]">Finish a cook to see how you compare with the recipe.</p>
      ) : (
        <p className="mt-2 text-xl text-[var(--ink-soft)]">
          Over all your cooks you take {Math.round(overallRatio * 100)}% of the time the recipes suggest
          (prep plus cook).
        </p>
      )}
      <ul className="mt-6 grid gap-5">
        {shown.map((e) => (
          <li key={e.id}>
            <p className="text-xl font-semibold">{e.title}</p>
            <div className="mt-1 grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-x-3 gap-y-1 text-base">
              <span>You</span>
              <span aria-hidden className="h-3 rounded-full bg-[var(--tomato)]" style={{ width: `${Math.max(1, (e.actualMinutes / scale) * 100)}%` }} />
              <span className="text-right font-semibold">{formatMinutes(e.actualMinutes)}</span>
              <span>Recipe</span>
              <span
                aria-hidden
                className="h-3 rounded-full border-2 border-[var(--ink)]"
                style={{ width: `${Math.max(1, (e.plannedMinutes / scale) * 100)}%` }}
              />
              <span className="text-right font-semibold">{formatMinutes(e.plannedMinutes)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SkillsPage() {
  const viewer = await getViewer();
  const entries = viewer ? await listSessions(viewer.id) : [];
  const finished = entries.map(toFinished).filter((s) => s !== null);

  const catalogue = finished.length > 0 ? await listRecipes({ viewerId: viewer!.id, scope: "catalogue" }) : [];
  const now = new Date();
  const sum = totals(finished);
  const streak = weeklyStreak(finished, now);
  const upNext = nextUp(finished, catalogue);
  const skipped = finished.filter((s) => !s.plausible).length;

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-14">
        <p className={kicker}>Skills</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05]">What your hands know</h1>
        {viewer?.isGuest && finished.length > 0 && <GuestNote />}

        {finished.length === 0 ? (
          <EmptyState title="Nothing cooked yet">
            Finish a recipe and your techniques, cuisines and streak start filling in here.
          </EmptyState>
        ) : (
          <>
            <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile term="Cooks" value={String(sum.sessions)} />
              <Tile term="Recipes" value={String(sum.recipes)} note="different ones" />
              <Tile term="Time at the stove" value={formatMinutes(sum.totalSeconds / 60)} />
              <Tile
                term="Weekly streak"
                value={plural(streak.current, "week")}
                note={`Best ever: ${plural(streak.longest, "week")}${
                  streak.current > 0 && !streak.activeThisWeek ? ". Cook this week to keep it." : ""
                }`}
              />
            </dl>

            <TechniqueMap sessions={finished} />
            <Cuisines sessions={finished} />
            <Pace sessions={finished} />

            <section aria-labelledby="next">
              <h2 id="next" className={h2}>
                Next up
              </h2>
              {upNext.length === 0 ? (
                <p className="mt-2 text-xl text-[var(--ink-soft)]">
                  You have practised every technique the catalogue uses.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-xl text-[var(--ink-soft)]">Recipes that teach you something you have not tried.</p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {upNext.map(({ recipe, newTechniques }) => (
                      <li key={recipe.id}>
                        <Link
                          href={`/recipes/${recipe.id}`}
                          className="block h-full rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-4 hover:bg-[var(--gold)]"
                        >
                          <span className="font-serif text-2xl font-semibold leading-tight">{recipe.title}</span>
                          <span className="mt-1 block text-base text-[var(--ink-soft)]">
                            {recipe.cuisine} · {recipe.difficulty}
                          </span>
                          <span className="mt-2 block text-lg">
                            New: <span className="font-semibold capitalize">{newTechniques.join(", ")}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {skipped > 0 && (
              <p className="mt-14 border-l-4 border-[var(--gold)] pl-3 text-lg text-[var(--ink-soft)]">
                {plural(skipped, "cook")} left out: finished faster than the timers allow, so{" "}
                {skipped === 1 ? "it reads" : "they read"} as a walkthrough.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
