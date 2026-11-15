import { STATIONS, TECHNIQUES, TECHNIQUE_STATION } from "@/lib/recipe/types";
import type { Difficulty, Recipe, Station, Technique } from "@/lib/recipe/types";

export interface FinishedSession {
  id: string;
  recipeId: string | null;
  title: string;
  cuisine: string;
  difficulty: Difficulty;
  finishedAt: Date;
  durationSeconds: number;
  techniques: readonly Technique[];
  plausible: boolean;
  plannedMinutes: number;
}

export type CatalogueRecipe = Pick<Recipe, "id" | "title" | "cuisine" | "difficulty"> & {
  steps: readonly Pick<Recipe["steps"][number], "technique">[];
};

const counted = (sessions: readonly FinishedSession[]) => sessions.filter((s) => s.plausible);

export interface TechniqueCount {
  technique: Technique;
  station: Station;
  count: number;
}

export function techniqueCounts(sessions: readonly FinishedSession[]): TechniqueCount[] {
  const tally = new Map<Technique, number>();
  for (const s of counted(sessions)) {
    for (const t of new Set(s.techniques)) tally.set(t, (tally.get(t) ?? 0) + 1);
  }
  return TECHNIQUES.map((technique) => ({
    technique,
    station: TECHNIQUE_STATION[technique],
    count: tally.get(technique) ?? 0,
  }));
}

export function techniqueMap(sessions: readonly FinishedSession[]) {
  const counts = techniqueCounts(sessions);
  return STATIONS.map((station) => ({ station, techniques: counts.filter((c) => c.station === station) }));
}

const WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

const LEVELS = [
  { label: "Curious", from: 1 },
  { label: "Comfortable", from: 3 },
  { label: "Confident", from: 6 },
  { label: "Fluent", from: 12 },
] as const;

export const TOP_LEVEL_POINTS = LEVELS.at(-1)!.from;

export interface CuisineLevel {
  cuisine: string;
  sessions: number;
  points: number;
  level: string;
  nextLevel: string | null;
  pointsToNext: number | null;
}

export function cuisineProficiency(sessions: readonly FinishedSession[]): CuisineLevel[] {
  const by = new Map<string, { sessions: number; points: number }>();
  for (const s of counted(sessions)) {
    const row = by.get(s.cuisine) ?? { sessions: 0, points: 0 };
    row.sessions += 1;
    row.points += WEIGHT[s.difficulty];
    by.set(s.cuisine, row);
  }
  return [...by]
    .map(([cuisine, { sessions: count, points }]) => {
      const reached = LEVELS.filter((l) => points >= l.from);
      const next = LEVELS.find((l) => points < l.from) ?? null;
      return {
        cuisine,
        sessions: count,
        points,
        level: reached.at(-1)!.label,
        nextLevel: next?.label ?? null,
        pointsToNext: next ? next.from - points : null,
      };
    })
    .sort((a, b) => b.points - a.points || a.cuisine.localeCompare(b.cuisine));
}

const DAY_MS = 86_400_000;

/** Weeks start on Monday (ISO); 1970-01-01 was a Thursday, hence the +3. */
const weekIndex = (d: Date) => Math.floor((Math.floor(d.getTime() / DAY_MS) + 3) / 7);

export interface Streak {
  current: number;
  longest: number;
  activeThisWeek: boolean;
}

/**
 * A streak that ended last week is still alive until this week is over, so
 * `current` counts back from last week when this week has no cook yet.
 */
export function weeklyStreak(sessions: readonly FinishedSession[], now: Date): Streak {
  const thisWeek = weekIndex(now);
  const weeks = [...new Set(counted(sessions).map((s) => weekIndex(s.finishedAt)))]
    .filter((w) => w <= thisWeek)
    .sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  weeks.forEach((w, i) => {
    run = i > 0 && weeks[i - 1] === w - 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  const last = weeks.at(-1);
  return {
    current: last === thisWeek || last === thisWeek - 1 ? run : 0,
    longest,
    activeThisWeek: last === thisWeek,
  };
}

export function totals(sessions: readonly FinishedSession[]) {
  const done = counted(sessions);
  return {
    sessions: done.length,
    recipes: new Set(done.map((s) => s.recipeId ?? `title:${s.title}`)).size,
    totalSeconds: done.reduce((sum, s) => sum + s.durationSeconds, 0),
  };
}

export interface PaceEntry {
  id: string;
  title: string;
  finishedAt: Date;
  actualMinutes: number;
  plannedMinutes: number;
  ratio: number | null;
}

export function pace(sessions: readonly FinishedSession[]) {
  const entries: PaceEntry[] = counted(sessions)
    .toSorted((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())
    .map((s) => {
      const actualMinutes = s.durationSeconds / 60;
      return {
        id: s.id,
        title: s.title,
        finishedAt: s.finishedAt,
        actualMinutes,
        plannedMinutes: s.plannedMinutes,
        ratio: s.plannedMinutes > 0 ? actualMinutes / s.plannedMinutes : null,
      };
    });
  const rated = entries.filter((e) => e.ratio !== null);
  const planned = rated.reduce((sum, e) => sum + e.plannedMinutes, 0);
  const actual = rated.reduce((sum, e) => sum + e.actualMinutes, 0);
  return { entries, overallRatio: planned > 0 ? actual / planned : null };
}

export interface NextUp {
  recipe: CatalogueRecipe;
  newTechniques: Technique[];
}

export function nextUp(
  sessions: readonly FinishedSession[],
  catalogue: readonly CatalogueRecipe[],
  limit = 6,
): NextUp[] {
  const practised = new Set(counted(sessions).flatMap((s) => s.techniques));
  return catalogue
    .map((recipe) => ({
      recipe,
      newTechniques: [...new Set(recipe.steps.map((s) => s.technique))].filter((t) => !practised.has(t)),
    }))
    .filter((r) => r.newTechniques.length > 0)
    .sort((a, b) => b.newTechniques.length - a.newTechniques.length || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, limit);
}
