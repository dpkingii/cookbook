import { describe, expect, it } from "vitest";
import { TECHNIQUES } from "@/lib/recipe/types";
import { buildRecap, isTimeZone } from "./recap";
import type { FinishedSession } from "./index";

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

const at = (iso: string) => new Date(iso);
const recap = (sessions: FinishedSession[], current: FinishedSession, tz = "UTC") =>
  buildRecap({ sessions, sessionId: current.id, tz })!;

describe("isTimeZone", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isTimeZone("Europe/Paris")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
  });
});

describe("buildRecap", () => {
  it("returns null for an unknown or unfinished session", () => {
    expect(buildRecap({ sessions: [session()], sessionId: "nope", tz: "UTC" })).toBeNull();
  });

  it("describes this session", () => {
    const s = session({ title: "Pomodoro", durationSeconds: 1590 });
    expect(recap([s], s).session).toEqual({ id: s.id, title: "Pomodoro", seconds: 1590, minutes: 27, plausible: true });
  });

  it("adds this session to today's and this week's minutes", () => {
    const earlier = session({ finishedAt: at("2026-11-11T08:00:00Z"), durationSeconds: 840 });
    const lastWeek = session({ finishedAt: at("2026-11-08T08:00:00Z"), durationSeconds: 6000 });
    const mine = session({ finishedAt: at("2026-11-11T18:00:00Z"), durationSeconds: 1620 });
    const r = recap([lastWeek, earlier, mine], mine);
    expect(r.today).toEqual({ before: 14, after: 41 });
    expect(r.week).toEqual({ before: 14, after: 41 });
    expect(r.nth).toEqual({ today: 2, week: 2 });
  });

  it("ignores sessions that finished after this one", () => {
    const mine = session({ finishedAt: at("2026-11-11T10:00:00Z"), durationSeconds: 600 });
    const later = session({ finishedAt: at("2026-11-12T10:00:00Z"), durationSeconds: 3000 });
    const r = recap([mine, later], mine);
    expect(r.week).toEqual({ before: 0, after: 10 });
    expect(r.streak.days).toEqual([false, false, true, false, false, false, false]);
  });

  it("starts the week on Monday: Sunday night and Monday morning are different weeks", () => {
    const sunday = session({ finishedAt: at("2026-11-15T22:00:00Z"), durationSeconds: 1200 });
    const monday = session({ finishedAt: at("2026-11-16T08:00:00Z"), durationSeconds: 600 });
    const r = recap([sunday, monday], monday);
    expect(r.week).toEqual({ before: 0, after: 10 });
    expect(r.today).toEqual({ before: 0, after: 10 });
    expect(r.streak).toMatchObject({ weeks: 2, todayIndex: 0 });
    expect(r.streak.days).toEqual([true, false, false, false, false, false, false]);
    expect(recap([sunday, monday], sunday).streak).toMatchObject({ weeks: 1, todayIndex: 6 });
  });

  it("uses the viewer's time zone for days and weeks", () => {
    const a = session({ finishedAt: at("2026-11-15T12:00:00Z"), durationSeconds: 1200 });
    const b = session({ finishedAt: at("2026-11-16T03:00:00Z"), durationSeconds: 600 });
    const utc = recap([a, b], b, "UTC");
    expect(utc.week).toEqual({ before: 0, after: 10 });
    expect(utc.streak.todayIndex).toBe(0);

    const la = recap([a, b], b, "America/Los_Angeles");
    expect(la.week).toEqual({ before: 20, after: 30 });
    expect(la.today).toEqual({ before: 20, after: 30 });
    expect(la.streak.todayIndex).toBe(6);

    const auckland = recap([a, b], b, "Pacific/Auckland");
    expect(auckland.week).toEqual({ before: 20, after: 30 });
    expect(auckland.today).toEqual({ before: 20, after: 30 });
    expect(auckland.nth).toEqual({ today: 2, week: 2 });
    expect(auckland.streak.todayIndex).toBe(0);
  });

  it("counts a streak of consecutive weeks and breaks it on a gap", () => {
    const wk = (day: string) => session({ finishedAt: at(`${day}T12:00:00Z`) });
    const mine = wk("2026-11-11");
    const run = [wk("2026-10-21"), wk("2026-10-29"), wk("2026-11-04"), mine];
    expect(recap(run, mine).streak.weeks).toBe(4);
    const gap = [wk("2026-10-14"), wk("2026-10-29"), wk("2026-11-04"), mine];
    expect(recap(gap, mine).streak.weeks).toBe(3);
    expect(recap([mine], mine).streak.weeks).toBe(1);
  });

  it("marks the days of the week that have a counted cook", () => {
    const mon = session({ finishedAt: at("2026-11-09T12:00:00Z") });
    const walk = session({ finishedAt: at("2026-11-10T12:00:00Z"), plausible: false });
    const mine = session({ finishedAt: at("2026-11-12T12:00:00Z") });
    const r = recap([mon, walk, mine], mine);
    expect(r.streak.days).toEqual([true, false, false, true, false, false, false]);
    expect(r.streak.todayIndex).toBe(3);
  });

  describe("techniques", () => {
    it("gives each technique's total count including this session and flags the first time", () => {
      const old1 = session({ techniques: ["chop", "saute"], finishedAt: at("2026-11-01T12:00:00Z") });
      const old2 = session({ techniques: ["saute"], finishedAt: at("2026-11-02T12:00:00Z") });
      const mine = session({ techniques: ["saute", "simmer"], finishedAt: at("2026-11-11T12:00:00Z") });
      const r = recap([old1, old2, mine], mine);
      expect(r.techniques.items).toEqual([
        { technique: "saute", count: 3, first: false },
        { technique: "simmer", count: 1, first: true },
      ]);
      expect(r.techniques.practised).toBe(3);
      expect(r.techniques.total).toBe(TECHNIQUES.length);
    });

    it("does not count a technique twice for one session", () => {
      const mine = session({ techniques: ["chop", "chop"] });
      expect(recap([mine], mine).techniques.items).toEqual([{ technique: "chop", count: 1, first: true }]);
    });

    it("does not count techniques practised only in implausible sessions", () => {
      const walk = session({ techniques: ["bake"], plausible: false, finishedAt: at("2026-11-01T12:00:00Z") });
      const mine = session({ techniques: ["bake"] });
      const r = recap([walk, mine], mine);
      expect(r.techniques.items).toEqual([{ technique: "bake", count: 1, first: true }]);
      expect(r.techniques.practised).toBe(1);
    });
  });

  describe("an implausible session", () => {
    const walk = session({ plausible: false, durationSeconds: 90, techniques: ["chop"], finishedAt: at("2026-11-11T12:00:00Z") });
    const before = session({ finishedAt: at("2026-11-11T08:00:00Z"), durationSeconds: 600, techniques: ["boil"] });

    it("changes no totals, streaks or techniques", () => {
      const r = recap([before, walk], walk);
      expect(r.session).toMatchObject({ plausible: false, seconds: 90 });
      expect(r.today).toEqual({ before: 10, after: 10 });
      expect(r.week).toEqual({ before: 10, after: 10 });
      expect(r.nth).toEqual({ today: null, week: null });
      expect(r.techniques.items).toEqual([]);
      expect(r.techniques.practised).toBe(1);
      expect(r.streak.weeks).toBe(1);
    });
  });
});
