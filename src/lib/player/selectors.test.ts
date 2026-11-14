import { describe, expect, it } from "vitest";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import type { Recipe } from "@/lib/recipe/types";
import { beginCooking, cancelTimer, finish, goTo, next, pause, resume, start, startStepTimer, tick } from "./commands";
import type { CommandContext } from "./commands";
import type { PlayerEvent } from "./events";
import { initialState, reduce } from "./reducer";
import type { Timer } from "./reducer";
import {
  dockTimers,
  elapsedMs,
  hasUnfinishedStayTimer,
  remainingMs,
  ringingTimers,
  stepProgress,
  summary,
  timerForStep,
} from "./selectors";
import { sequentialIds } from "./testing";

const T0 = 1_700_000_000_000;

function cook(recipe: Recipe = DEMO_RECIPE) {
  const makeId = sequentialIds();
  let state = initialState(recipe);
  let now = T0;
  const api = {
    get state() {
      return state;
    },
    get now() {
      return now;
    },
    at(ms: number) {
      now = T0 + ms;
      return api;
    },
    run(command: (ctx: CommandContext) => PlayerEvent[]) {
      state = reduce(state, command({ state, recipe, now, makeId }));
      return api;
    },
    tick() {
      state = reduce(state, tick(state, now, makeId));
      return api;
    },
  };
  return api.run(start).run(beginCooking);
}

const timer = (over: Partial<Timer>): Timer => ({
  id: "t",
  stepIndex: 0,
  label: "x",
  mode: "background",
  seconds: 60,
  startedAt: T0,
  endsAt: T0 + 60_000,
  pausedAt: null,
  status: "running",
  ...over,
});

describe("remainingMs", () => {
  it("counts down to zero from the absolute end time", () => {
    expect(remainingMs(timer({}), T0)).toBe(60_000);
    expect(remainingMs(timer({}), T0 + 45_500)).toBe(14_500);
    expect(remainingMs(timer({}), T0 + 90_000)).toBe(0);
  });

  it("is frozen while paused", () => {
    const t = timer({ pausedAt: T0 + 20_000 });
    expect(remainingMs(t, T0 + 20_000)).toBe(40_000);
    expect(remainingMs(t, T0 + 500_000)).toBe(40_000);
  });

  it("is zero for ringing, done and cancelled timers", () => {
    for (const status of ["ringing", "done", "cancelled"] as const) {
      expect(remainingMs(timer({ status }), T0)).toBe(0);
    }
  });

  it("is measured from the stored end, not from when the timer was started", () => {
    const s = cook().at(1000).run(startStepTimer);
    expect(remainingMs(s.state.timers[0], T0 + 301_000)).toBe(180_000);
  });
});

describe("dockTimers", () => {
  it("lists running or ringing timers from other steps, soonest first", () => {
    const s = cook().run(startStepTimer);
    expect(dockTimers(s.state)).toEqual([]);
    s.run((c) => goTo(c, 5)).run(startStepTimer);
    expect(dockTimers(s.state).map((t) => t.label)).toEqual(["Water to a boil"]);
    s.run((c) => goTo(c, 6)).at(10_000).run(startStepTimer);
    s.run((c) => goTo(c, 7));
    expect(dockTimers(s.state).map((t) => t.label)).toEqual(["Water to a boil", "Spaghetti", "Sauce simmering"]);
  });

  it("keeps ringing timers until acknowledged and drops cancelled ones", () => {
    const s = cook().run(startStepTimer).run((c) => goTo(c, 5)).run(startStepTimer).run((c) => goTo(c, 7));
    s.at(480_000).tick();
    expect(dockTimers(s.state).map((t) => [t.label, t.status])).toEqual([
      ["Water to a boil", "ringing"],
      ["Sauce simmering", "running"],
    ]);
    const sauce = s.state.timers[1].id;
    s.run((c) => cancelTimer(c, sauce));
    expect(dockTimers(s.state).map((t) => t.label)).toEqual(["Water to a boil"]);
  });
});

describe("ringingTimers and timerForStep", () => {
  it("finds ringing timers anywhere and the latest timer for a step", () => {
    const s = cook().run(startStepTimer);
    const first = s.state.timers[0].id;
    s.run((c) => cancelTimer(c, first)).run(startStepTimer);
    expect(timerForStep(s.state, 0)?.id).not.toBe(first);
    expect(timerForStep(s.state, 1)).toBeNull();
    s.at(480_000).tick();
    expect(ringingTimers(s.state).map((t) => t.stepIndex)).toEqual([0]);
  });
});

describe("stepProgress", () => {
  it("is null when the current step has no timer or it has not started", () => {
    const s = cook();
    expect(stepProgress(s.state, DEMO_RECIPE, T0)).toBeNull();
    s.run(next);
    expect(stepProgress(s.state, DEMO_RECIPE, T0)).toBeNull();
  });

  it("runs from 0 to 1 over the timer and stays at 1 once finished", () => {
    const s = cook().run(startStepTimer);
    expect(stepProgress(s.state, DEMO_RECIPE, T0)).toBe(0);
    expect(stepProgress(s.state, DEMO_RECIPE, T0 + 120_000)).toBe(0.25);
    expect(stepProgress(s.state, DEMO_RECIPE, T0 + 999_000)).toBe(1);
    s.at(480_000).tick();
    expect(stepProgress(s.state, DEMO_RECIPE, T0 + 480_000)).toBe(1);
  });

  it("is null again after the timer is cancelled", () => {
    const s = cook().run(startStepTimer);
    const id = s.state.timers[0].id;
    s.run((c) => cancelTimer(c, id));
    expect(stepProgress(s.state, DEMO_RECIPE, T0)).toBeNull();
  });

  it("holds still while paused", () => {
    const s = cook().run(startStepTimer).at(240_000).run(pause);
    expect(stepProgress(s.state, DEMO_RECIPE, T0 + 400_000)).toBe(0.5);
    s.at(300_000).run(resume);
    expect(stepProgress(s.state, DEMO_RECIPE, T0 + 300_000)).toBe(0.5);
  });
});

describe("hasUnfinishedStayTimer", () => {
  it("is true only while the current step's stay timer is running", () => {
    const s = cook();
    s.run(startStepTimer);
    expect(hasUnfinishedStayTimer(s.state)).toBe(false);
    s.run((c) => goTo(c, 3));
    expect(hasUnfinishedStayTimer(s.state)).toBe(false);
    s.at(1000).run(startStepTimer);
    expect(hasUnfinishedStayTimer(s.state)).toBe(true);
    s.run(next);
    expect(hasUnfinishedStayTimer(s.state)).toBe(false);
    s.run((c) => goTo(c, 3));
    s.at(241_000).tick();
    expect(hasUnfinishedStayTimer(s.state)).toBe(false);
  });
});

describe("elapsedMs", () => {
  it("is zero before the session starts", () => {
    expect(elapsedMs(initialState(DEMO_RECIPE), T0)).toBe(0);
  });

  it("excludes paused time, including an ongoing pause", () => {
    const s = cook().at(60_000).run(pause);
    expect(elapsedMs(s.state, T0 + 90_000)).toBe(60_000);
    s.at(100_000).run(resume);
    expect(elapsedMs(s.state, T0 + 130_000)).toBe(90_000);
  });

  it("stops at finishedAt", () => {
    const s = cook().at(200_000).run((c) => finish(c, {}));
    expect(elapsedMs(s.state, T0 + 999_999)).toBe(200_000);
  });
});

describe("summary", () => {
  it("reports duration, distinct techniques of completed steps and counts", () => {
    const s = cook();
    for (let i = 0; i < 6; i++) s.run(next);
    s.at(600_000).run((c) => finish(c, { rating: 4 }));
    expect(summary(s.state, DEMO_RECIPE)).toEqual({
      durationSeconds: 600,
      techniques: ["boil", "chop", "mince", "saute", "simmer"],
      completedSteps: 6,
      totalSteps: 10,
      plausible: true,
    });
  });

  it("is implausible when finished under 25% of the recipe's timer seconds", () => {
    const quarter = (480 + 240 + 45 + 600 + 540 + 60) * 250;
    const tooFast = cook().at(quarter - 1).run((c) => finish(c, {}));
    expect(summary(tooFast.state, DEMO_RECIPE).plausible).toBe(false);
    const justEnough = cook().at(quarter).run((c) => finish(c, {}));
    expect(summary(justEnough.state, DEMO_RECIPE).plausible).toBe(true);
  });

  it("does not count paused time towards plausibility", () => {
    const s = cook().at(1000).run(pause).at(3_600_000).run(resume).at(3_610_000).run((c) => finish(c, {}));
    expect(summary(s.state, DEMO_RECIPE)).toMatchObject({ durationSeconds: 11, plausible: false });
  });

  it("is implausible and zero-length when the session has not finished", () => {
    const s = cook().at(900_000);
    expect(summary(s.state, DEMO_RECIPE)).toMatchObject({ durationSeconds: 0, plausible: false });
  });

  it("treats any finished session of a timer-less recipe as plausible", () => {
    const noTimers: Recipe = { ...DEMO_RECIPE, steps: DEMO_RECIPE.steps.map((step) => ({ ...step, timer: undefined })) };
    const s = cook(noTimers).at(5000).run((c) => finish(c, {}));
    expect(summary(s.state, noTimers).plausible).toBe(true);
  });
});
