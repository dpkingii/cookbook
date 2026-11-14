import { describe, expect, it } from "vitest";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import {
  acknowledgeTimer,
  back,
  beginCooking,
  cancelTimer,
  finish,
  goTo,
  next,
  pause,
  resume,
  start,
  startStepTimer,
  tick,
  toggleMise,
} from "./commands";
import type { CommandContext } from "./commands";
import type { PlayerEvent } from "./events";
import { initialState, reduce } from "./reducer";
import type { PlayerState } from "./reducer";
import { deepFreeze, sequentialIds } from "./testing";

const T0 = 1_700_000_000_000;

function session() {
  const makeId = sequentialIds();
  let state = initialState(DEMO_RECIPE);
  let now = T0;
  const log: PlayerEvent[] = [];
  return {
    get state() {
      return state;
    },
    at(ms: number) {
      now = T0 + ms;
      return this;
    },
    ctx(): CommandContext {
      return { state, recipe: DEMO_RECIPE, now, makeId };
    },
    run(command: (ctx: CommandContext) => PlayerEvent[]) {
      const events = command(this.ctx());
      log.push(...events);
      state = reduce(state, events);
      return events;
    },
    log,
  };
}

function cookingSession() {
  const s = session();
  s.run(start);
  s.run(beginCooking);
  return s;
}

const types = (events: PlayerEvent[]) => events.map((e) => e.type);

describe("command basics", () => {
  it("stamps each event with a fresh id and the given now", () => {
    const s = session().at(500);
    const [e] = s.run(start);
    expect(e).toEqual({ type: "session_started", id: "id-1", at: T0 + 500 });
  });

  it("never mutates state", () => {
    const s = cookingSession();
    const frozen = deepFreeze(s.state);
    const ctx = { ...s.ctx(), state: frozen };
    for (const cmd of [next, back, startStepTimer, pause, resume]) expect(() => cmd(ctx)).not.toThrow();
    expect(() => tick(frozen, T0 + 1e9, sequentialIds("tk1"))).not.toThrow();
    expect(() => goTo(ctx, 3)).not.toThrow();
    expect(() => finish(ctx, { rating: 3 })).not.toThrow();
  });

  it("returns no events when the intent makes no sense", () => {
    const s = session();
    expect(s.run(beginCooking)).toEqual([]);
    expect(s.run(next)).toEqual([]);
    expect(s.run(pause)).toEqual([]);
    expect(s.run((c) => finish(c, {}))).toEqual([]);
    s.run(start);
    expect(s.run(start)).toEqual([]);
    expect(s.run(resume)).toEqual([]);
  });
});

describe("start and beginCooking", () => {
  it("moves through mise into cooking", () => {
    const s = session();
    expect(types(s.run(start))).toEqual(["session_started"]);
    expect(types(s.run(beginCooking))).toEqual(["cooking_started"]);
    expect(s.state.phase).toBe("cooking");
    expect(s.run(beginCooking)).toEqual([]);
  });
});

describe("toggleMise", () => {
  it("flips an ingredient's checked state during mise only", () => {
    const s = session();
    expect(s.run((c) => toggleMise(c, "onion"))).toEqual([]);
    s.run(start);
    expect(s.run((c) => toggleMise(c, "onion"))).toMatchObject([
      { type: "mise_checked", ingredientId: "onion", checked: true },
    ]);
    expect(s.run((c) => toggleMise(c, "onion"))).toMatchObject([{ checked: false }]);
    expect(s.run((c) => toggleMise(c, "truffle"))).toEqual([]);
    s.run(beginCooking);
    expect(s.run((c) => toggleMise(c, "onion"))).toEqual([]);
  });
});

describe("navigation", () => {
  it("next completes the current step and enters the following one", () => {
    const s = cookingSession();
    const events = s.run(next);
    expect(events).toMatchObject([
      { type: "step_completed", stepIndex: 0 },
      { type: "step_entered", stepIndex: 1 },
    ]);
    expect(s.state.currentStep).toBe(1);
    expect(s.state.completed).toEqual([0]);
  });

  it("next on a step already completed only moves forward", () => {
    const s = cookingSession();
    s.run(next);
    s.run(back);
    expect(s.run(next)).toMatchObject([{ type: "step_entered", stepIndex: 1 }]);
  });

  it("next on the last step yields the completion only", () => {
    const s = cookingSession();
    s.run((c) => goTo(c, 9));
    expect(s.run(next)).toMatchObject([{ type: "step_completed", stepIndex: 9 }]);
    expect(s.state.currentStep).toBe(9);
    expect(s.run(next)).toEqual([]);
  });

  it("back goes to the previous step without uncompleting anything", () => {
    const s = cookingSession();
    s.run(next);
    expect(s.run(back)).toMatchObject([{ type: "step_entered", stepIndex: 0 }]);
    expect(s.state.completed).toEqual([0]);
    expect(s.run(back)).toEqual([]);
  });

  it("goTo jumps to a valid step and ignores invalid or current ones", () => {
    const s = cookingSession();
    expect(s.run((c) => goTo(c, 6))).toMatchObject([{ type: "step_entered", stepIndex: 6 }]);
    expect(s.run((c) => goTo(c, 6))).toEqual([]);
    expect(s.run((c) => goTo(c, 99))).toEqual([]);
  });

  it("next still works while a stay timer is running", () => {
    const s = cookingSession();
    s.run((c) => goTo(c, 3));
    s.run(startStepTimer);
    expect(types(s.run(next))).toEqual(["step_completed", "step_entered"]);
  });

  it("navigation is ignored while paused", () => {
    const s = cookingSession();
    s.run(pause);
    expect(s.run(next)).toEqual([]);
    expect(s.run((c) => goTo(c, 4))).toEqual([]);
  });
});

describe("timers", () => {
  it("startStepTimer starts the current step's timer with an absolute end", () => {
    const s = cookingSession().at(2000);
    const [e] = s.run(startStepTimer);
    expect(e).toEqual({
      type: "timer_started",
      id: expect.any(String),
      at: T0 + 2000,
      timerId: expect.any(String),
      stepIndex: 0,
      endsAt: T0 + 2000 + 480_000,
      seconds: 480,
      label: "Water to a boil",
      mode: "background",
    });
    expect(e.id).not.toBe((e as { timerId: string }).timerId);
  });

  it("startStepTimer does nothing on a step without a timer or with one already active", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    expect(s.run(startStepTimer)).toEqual([]);
    s.run(next);
    expect(s.run(startStepTimer)).toEqual([]);
  });

  it("cancelTimer cancels a running timer only", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    const id = s.state.timers[0].id;
    expect(s.run((c) => cancelTimer(c, "nope"))).toEqual([]);
    expect(s.run((c) => cancelTimer(c, id))).toMatchObject([{ type: "timer_cancelled", timerId: id }]);
    expect(s.run((c) => cancelTimer(c, id))).toEqual([]);
  });

  it("tick emits timer_finished for every timer that is due, once", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    s.run((c) => goTo(c, 5));
    s.run(startStepTimer);
    expect(tick(s.at(479_999).state, T0 + 479_999, sequentialIds("tk2"))).toEqual([]);
    const due = tick(s.state, T0 + 480_000, sequentialIds("tick"));
    expect(due).toEqual([{ type: "timer_finished", id: "tick-1", at: T0 + 480_000, timerId: s.state.timers[0].id }]);
    const both = tick(s.state, T0 + 700_000, sequentialIds("tk3"));
    expect(both.map((e) => (e as { timerId: string }).timerId)).toEqual(s.state.timers.map((t) => t.id));
    const after = reduce(s.state, both);
    expect(tick(after, T0 + 800_000, sequentialIds("tk4"))).toEqual([]);
  });

  it("tick emits nothing while paused, and respects the shifted end after resume", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    s.at(100_000).run(pause);
    expect(tick(s.state, T0 + 900_000, sequentialIds("tk5"))).toEqual([]);
    s.at(400_000).run(resume);
    expect(tick(s.state, T0 + 779_999, sequentialIds("tk6"))).toEqual([]);
    expect(tick(s.state, T0 + 780_000, sequentialIds("tk7"))).toHaveLength(1);
  });

  it("acknowledgeTimer settles a ringing timer only", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    const id = s.state.timers[0].id;
    expect(s.run((c) => acknowledgeTimer(c, id))).toEqual([]);
    s.at(480_000).run((c) => tick(c.state, c.now, c.makeId));
    expect(s.run((c) => acknowledgeTimer(c, id))).toMatchObject([{ type: "timer_acknowledged", timerId: id }]);
    expect(s.state.timers[0].status).toBe("done");
  });

  it("a step's timer can be run again after it is done", () => {
    const s = cookingSession();
    s.run(startStepTimer);
    const id = s.state.timers[0].id;
    s.at(480_000).run((c) => tick(c.state, c.now, c.makeId));
    s.run((c) => acknowledgeTimer(c, id));
    expect(types(s.run(startStepTimer))).toEqual(["timer_started"]);
  });
});

describe("pause, resume, finish", () => {
  it("pause and resume toggle", () => {
    const s = cookingSession();
    expect(types(s.run(pause))).toEqual(["session_paused"]);
    expect(s.run(pause)).toEqual([]);
    expect(types(s.run(resume))).toEqual(["session_resumed"]);
    expect(s.run(resume)).toEqual([]);
  });

  it("finish carries rating and note, and only once", () => {
    const s = cookingSession();
    expect(s.run((c) => finish(c, { rating: 5, note: "perfect" }))).toMatchObject([
      { type: "session_finished", rating: 5, note: "perfect" },
    ]);
    expect(s.run((c) => finish(c, {}))).toEqual([]);
  });

  it("finish omits rating and note when not given", () => {
    const s = cookingSession();
    const [e] = s.run((c) => finish(c, {}));
    expect(e).toEqual({ type: "session_finished", id: expect.any(String), at: T0 });
  });

  it("every command emits only events the reducer accepts", () => {
    const s = cookingSession();
    const state: PlayerState = s.state;
    const events = next(s.ctx());
    const applied = reduce(state, events);
    expect(Object.keys(applied.applied)).toHaveLength(Object.keys(state.applied).length + events.length);
  });
});
