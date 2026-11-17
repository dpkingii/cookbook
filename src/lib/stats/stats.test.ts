import { describe, expect, it } from "vitest";
import { TECHNIQUES } from "@/lib/recipe/types";
import {
  cuisineProficiency,
  nextUp,
  pace,
  techniqueCounts,
  techniqueMap,
  totals,
  weeklyStreak,
  type CatalogueRecipe,
  type FinishedSession,
} from "./index";

let n = 0;
function session(over: Partial<FinishedSession> = {}): FinishedSession {
  n += 1;
  return {
    id: `s${n}`,
    recipeId: `r${n}`,
    title: `Dish ${n}`,
    cuisine: "Italian",
    difficulty: "easy",
    finishedAt: new Date("2026-11-11T12:00:00Z"),
    durationSeconds: 1200,
    techniques: ["chop"],
    plausible: true,
    plannedMinutes: 20,
    ...over,
  };
}

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("techniqueCounts", () => {
  it("lists all 20 techniques, zero included, in station order", () => {
    const counts = techniqueCounts([]);
    expect(counts.map((c) => c.technique)).toEqual(TECHNIQUES);
    expect(counts.every((c) => c.count === 0)).toBe(true);
  });

  it("counts sessions per technique and ignores implausible ones", () => {
    const counts = techniqueCounts([
      session({ techniques: ["chop", "saute"] }),
      session({ techniques: ["chop"] }),
      session({ techniques: ["bake"], plausible: false }),
    ]);
    const by = Object.fromEntries(counts.map((c) => [c.technique, c.count]));
    expect(by).toMatchObject({ chop: 2, saute: 1, bake: 0, mince: 0 });
  });

  it("groups by station, six stations, every technique once", () => {
    const groups = techniqueMap([session({ techniques: ["sear"] })]);
    expect(groups.map((g) => g.station)).toEqual(["board", "bowl", "pan", "pot", "oven", "rest"]);
    expect(groups.flatMap((g) => g.techniques)).toHaveLength(20);
    expect(groups.find((g) => g.station === "pan")!.techniques.map((t) => [t.technique, t.count])).toEqual([
      ["saute", 0],
      ["sear", 1],
      ["fry", 0],
    ]);
  });
});

describe("cuisineProficiency", () => {
  it("weights easy 1, medium 2, hard 3 and sorts by points", () => {
    const rows = cuisineProficiency([
      session({ cuisine: "Italian", difficulty: "easy" }),
      session({ cuisine: "Italian", difficulty: "hard" }),
      session({ cuisine: "Chinese", difficulty: "medium" }),
      session({ cuisine: "Thai", difficulty: "hard", plausible: false }),
    ]);
    expect(rows.map((r) => [r.cuisine, r.sessions, r.points])).toEqual([
      ["Italian", 2, 4],
      ["Chinese", 1, 2],
    ]);
  });

  it("labels levels and says how far the next one is", () => {
    const cook = (count: number) =>
      cuisineProficiency(Array.from({ length: count }, () => session({ cuisine: "Thai" })))[0];
    expect(cook(1)).toMatchObject({ level: "Curious", nextLevel: "Comfortable", pointsToNext: 2 });
    expect(cook(3).level).toBe("Comfortable");
    expect(cook(6).level).toBe("Confident");
    expect(cook(12)).toMatchObject({ level: "Fluent", nextLevel: null, pointsToNext: null });
  });
});

describe("weeklyStreak", () => {
  const now = at("2026-11-15");

  it("is zero with no sessions", () => {
    expect(weeklyStreak([], now)).toEqual({ current: 0, longest: 0, activeThisWeek: false });
  });

  it("counts consecutive ISO weeks up to the current one", () => {
    const sessions = ["2026-11-10", "2026-11-03", "2026-10-28"].map((d) => session({ finishedAt: at(d) }));
    expect(weeklyStreak(sessions, now)).toEqual({ current: 3, longest: 3, activeThisWeek: true });
  });

  it("treats Sunday and Monday as different weeks", () => {
    const sessions = [session({ finishedAt: at("2026-11-08") }), session({ finishedAt: at("2026-11-09") })];
    expect(weeklyStreak(sessions, now).current).toBe(2);
  });

  it("keeps the streak alive through last week and marks this week empty", () => {
    const sessions = ["2026-11-04", "2026-10-28"].map((d) => session({ finishedAt: at(d) }));
    expect(weeklyStreak(sessions, now)).toEqual({ current: 2, longest: 2, activeThisWeek: false });
  });

  it("breaks on a gap but remembers the longest run", () => {
    const sessions = ["2026-11-12", "2026-10-20", "2026-10-13", "2026-10-06", "2026-09-29"].map((d) =>
      session({ finishedAt: at(d) }),
    );
    expect(weeklyStreak(sessions, now)).toEqual({ current: 1, longest: 4, activeThisWeek: true });
  });

  it("counts several sessions in one week once and skips implausible ones", () => {
    const sessions = [
      session({ finishedAt: at("2026-11-10") }),
      session({ finishedAt: at("2026-11-11") }),
      session({ finishedAt: at("2026-11-03"), plausible: false }),
    ];
    expect(weeklyStreak(sessions, now)).toEqual({ current: 1, longest: 1, activeThisWeek: true });
  });

  it("handles a year boundary", () => {
    const sessions = ["2026-01-02", "2025-12-24", "2025-12-17"].map((d) => session({ finishedAt: at(d) }));
    expect(weeklyStreak(sessions, at("2026-01-03")).current).toBe(3);
  });

  it("places a late Sunday cook in the cook's own week, not the UTC one", () => {
    const lateSunday = new Date("2026-11-16T02:30:00Z");
    const sessions = [session({ finishedAt: lateSunday })];
    const tuesday = new Date("2026-11-17T18:00:00Z");
    expect(weeklyStreak(sessions, tuesday).activeThisWeek).toBe(true);
    expect(weeklyStreak(sessions, tuesday, "America/New_York").activeThisWeek).toBe(false);
  });
});

describe("totals", () => {
  it("counts plausible sessions, distinct recipes and cooking time", () => {
    const result = totals([
      session({ recipeId: "a", durationSeconds: 600 }),
      session({ recipeId: "a", durationSeconds: 900 }),
      session({ recipeId: "b", durationSeconds: 300 }),
      session({ recipeId: "c", durationSeconds: 5000, plausible: false }),
    ]);
    expect(result).toEqual({ sessions: 3, recipes: 2, totalSeconds: 1800 });
  });

  it("tells deleted recipes apart by title", () => {
    const result = totals([
      session({ recipeId: null, title: "Gone A" }),
      session({ recipeId: null, title: "Gone B" }),
      session({ recipeId: null, title: "Gone A" }),
    ]);
    expect(result.recipes).toBe(2);
  });
});

describe("pace", () => {
  it("compares actual time with prep plus cook, newest first", () => {
    const { entries, overallRatio } = pace([
      session({ id: "old", finishedAt: at("2026-11-01"), durationSeconds: 1800, plannedMinutes: 20 }),
      session({ id: "new", finishedAt: at("2026-11-09"), durationSeconds: 900, plannedMinutes: 30 }),
      session({ id: "skip", durationSeconds: 60, plannedMinutes: 30, plausible: false }),
    ]);
    expect(entries.map((e) => [e.id, e.actualMinutes, e.plannedMinutes, e.ratio])).toEqual([
      ["new", 15, 30, 0.5],
      ["old", 30, 20, 1.5],
    ]);
    expect(overallRatio).toBeCloseTo(45 / 50);
  });

  it("has no overall ratio without sessions", () => {
    expect(pace([])).toEqual({ entries: [], overallRatio: null });
  });
});

describe("nextUp", () => {
  const recipe = (id: string, techniques: CatalogueRecipe["steps"][number]["technique"][]): CatalogueRecipe => ({
    id,
    title: `Recipe ${id}`,
    cuisine: "Thai",
    difficulty: "easy",
    steps: techniques.map((technique) => ({ technique })),
  });

  it("ranks recipes by how many untried techniques they use", () => {
    const sessions = [session({ techniques: ["chop", "saute"] })];
    const result = nextUp(sessions, [
      recipe("a", ["chop", "saute"]),
      recipe("b", ["chop", "bake"]),
      recipe("c", ["bake", "roast", "rest", "bake"]),
    ]);
    expect(result.map((r) => [r.recipe.id, r.newTechniques])).toEqual([
      ["c", ["bake", "roast", "rest"]],
      ["b", ["bake"]],
    ]);
  });

  it("ignores implausible sessions when deciding what is practised", () => {
    const result = nextUp([session({ techniques: ["bake"], plausible: false })], [recipe("a", ["bake"])]);
    expect(result).toHaveLength(1);
  });

  it("respects the limit and breaks ties by title", () => {
    const result = nextUp([], [recipe("z", ["chop"]), recipe("b", ["chop"]), recipe("m", ["chop"])], 2);
    expect(result.map((r) => r.recipe.id)).toEqual(["b", "m"]);
  });
});
