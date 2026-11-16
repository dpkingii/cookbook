import { describe, expect, it } from "vitest";
import { thisWeek } from "./week";

const cook = (iso: string, durationSeconds = 600, plausible = true) => ({
  finishedAt: new Date(iso),
  plausible,
  durationSeconds,
});

describe("thisWeek", () => {
  const wednesday = new Date("2026-11-18T12:00:00Z");

  it("marks the cooked days from Monday and finds today", () => {
    const week = thisWeek([cook("2026-11-16T09:00:00Z"), cook("2026-11-18T08:00:00Z", 300)], wednesday);
    expect(week.cooked).toEqual([true, false, true, false, false, false, false]);
    expect(week.today).toBe(2);
    expect(week.seconds).toBe(900);
  });

  it("ignores other weeks and walkthroughs", () => {
    const week = thisWeek(
      [cook("2026-11-15T23:00:00Z"), cook("2026-11-23T01:00:00Z"), cook("2026-11-17T10:00:00Z", 60, false)],
      wednesday,
    );
    expect(week.cooked.some(Boolean)).toBe(false);
    expect(week.seconds).toBe(0);
  });

  it("puts Sunday last", () => {
    const sunday = new Date("2026-11-22T10:00:00Z");
    expect(thisWeek([cook("2026-11-22T09:00:00Z")], sunday)).toMatchObject({ today: 6 });
  });
});
