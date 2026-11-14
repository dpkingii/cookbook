import { describe, expect, it } from "vitest";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import { initialState, reduce, replay } from "./reducer";
import type { PlayerState } from "./reducer";
import type { PlayerEvent } from "./events";
import { deepFreeze, eventFactory } from "./testing";
import type { EventInput } from "./testing";

const T0 = 1_700_000_000_000;

function play(inputs: Array<[number, EventInput]>) {
  const ev = eventFactory();
  const events = inputs.map(([dt, input]) => ev(T0 + dt, input));
  return { events, state: replay(DEMO_RECIPE, events) };
}

const cooking: Array<[number, EventInput]> = [
  [0, { type: "session_started" }],
  [1000, { type: "cooking_started" }],
];

const boilTimer = (dt: number, timerId = "t-boil"): [number, EventInput] => [
  dt,
  {
    type: "timer_started",
    timerId,
    stepIndex: 0,
    endsAt: T0 + dt + 480_000,
    seconds: 480,
    label: "Water to a boil",
    mode: "background",
  },
];

describe("initialState", () => {
  it("starts in mise with nothing done", () => {
    const s = initialState(DEMO_RECIPE);
    expect(s.phase).toBe("mise");
    expect(s.currentStep).toBe(0);
    expect(s.completed).toEqual([]);
    expect(s.checked).toEqual([]);
    expect(s.timers).toEqual([]);
    expect(s.startedAt).toBeNull();
    expect(s.finishedAt).toBeNull();
    expect(s.paused).toBe(false);
    expect(s.applied).toEqual({});
  });
});

describe("session lifecycle", () => {
  it("session_started records startedAt and the event id", () => {
    const { state, events } = play([[0, { type: "session_started" }]]);
    expect(state.startedAt).toBe(T0);
    expect(state.applied[events[0].id]).toBe(true);
  });

  it("ignores a second session_started", () => {
    const { state } = play([
      [0, { type: "session_started" }],
      [5000, { type: "session_started" }],
    ]);
    expect(state.startedAt).toBe(T0);
    expect(Object.keys(state.applied)).toHaveLength(1);
  });

  it("ignores everything before session_started", () => {
    const { state } = play([
      [0, { type: "mise_checked", ingredientId: "onion", checked: true }],
      [0, { type: "cooking_started" }],
      [0, { type: "session_paused" }],
      [0, { type: "session_finished" }],
    ]);
    expect(state).toEqual(initialState(DEMO_RECIPE));
  });

  it("cooking_started moves from mise to cooking at step 0", () => {
    const { state } = play(cooking);
    expect(state.phase).toBe("cooking");
    expect(state.currentStep).toBe(0);
    expect(state.cookingStartedAt).toBe(T0 + 1000);
  });

  it("session_finished records finish time, rating and note", () => {
    const { state } = play([
      ...cooking,
      [9000, { type: "session_finished", rating: 4, note: "more basil" }],
    ]);
    expect(state.phase).toBe("finished");
    expect(state.finishedAt).toBe(T0 + 9000);
    expect(state.rating).toBe(4);
    expect(state.note).toBe("more basil");
  });

  it("session_finished without rating or note stores nulls", () => {
    const { state } = play([...cooking, [9000, { type: "session_finished" }]]);
    expect(state.rating).toBeNull();
    expect(state.note).toBeNull();
  });

  it("ignores every event after session_finished", () => {
    const { state: finished } = play([...cooking, [9000, { type: "session_finished" }]]);
    const after = [
      { type: "step_entered", stepIndex: 2 },
      { type: "step_completed", stepIndex: 0 },
      boilTimer(10_000)[1],
      { type: "session_paused" },
      { type: "session_finished", rating: 1 },
      { type: "mise_checked", ingredientId: "onion", checked: true },
    ] satisfies EventInput[];
    const ev = eventFactory();
    let s = finished;
    for (const input of after) s = reduce(s, { ...ev(T0 + 10_000, input), id: `late-${input.type}` });
    expect(s).toBe(finished);
  });
});

describe("mise en place", () => {
  it("checks and unchecks ingredients", () => {
    const { state } = play([
      [0, { type: "session_started" }],
      [100, { type: "mise_checked", ingredientId: "onion", checked: true }],
      [200, { type: "mise_checked", ingredientId: "garlic", checked: true }],
      [300, { type: "mise_checked", ingredientId: "onion", checked: false }],
    ]);
    expect(state.checked).toEqual(["garlic"]);
  });

  it("ignores unknown ingredients and redundant checks", () => {
    const { state } = play([
      [0, { type: "session_started" }],
      [100, { type: "mise_checked", ingredientId: "truffle", checked: true }],
      [200, { type: "mise_checked", ingredientId: "onion", checked: false }],
      [300, { type: "mise_checked", ingredientId: "onion", checked: true }],
      [400, { type: "mise_checked", ingredientId: "onion", checked: true }],
    ]);
    expect(state.checked).toEqual(["onion"]);
    expect(Object.keys(state.applied)).toHaveLength(2);
  });

  it("ignores mise_checked once cooking", () => {
    const { state } = play([
      ...cooking,
      [2000, { type: "mise_checked", ingredientId: "onion", checked: true }],
    ]);
    expect(state.checked).toEqual([]);
  });
});

describe("steps", () => {
  it("enters valid steps and ignores out-of-range ones", () => {
    const { state } = play([
      ...cooking,
      [2000, { type: "step_entered", stepIndex: 3 }],
      [3000, { type: "step_entered", stepIndex: 99 }],
      [3000, { type: "step_entered", stepIndex: -1 }],
      [3000, { type: "step_entered", stepIndex: 1.5 }],
    ]);
    expect(state.currentStep).toBe(3);
  });

  it("ignores step_entered during mise", () => {
    const { state } = play([
      [0, { type: "session_started" }],
      [100, { type: "step_entered", stepIndex: 2 }],
    ]);
    expect(state.currentStep).toBe(0);
  });

  it("completes the current step once, keeping the set sorted", () => {
    const { state } = play([
      ...cooking,
      [2000, { type: "step_entered", stepIndex: 2 }],
      [2100, { type: "step_completed", stepIndex: 2 }],
      [2200, { type: "step_entered", stepIndex: 0 }],
      [2300, { type: "step_completed", stepIndex: 0 }],
      [2400, { type: "step_completed", stepIndex: 0 }],
    ]);
    expect(state.completed).toEqual([0, 2]);
  });

  it("ignores completing a step that is not current", () => {
    const { state } = play([...cooking, [2000, { type: "step_completed", stepIndex: 4 }]]);
    expect(state.completed).toEqual([]);
  });
});

describe("timers", () => {
  it("timer_started stores the absolute end time", () => {
    const { state } = play([...cooking, boilTimer(2000)]);
    expect(state.timers).toEqual([
      {
        id: "t-boil",
        stepIndex: 0,
        label: "Water to a boil",
        mode: "background",
        seconds: 480,
        startedAt: T0 + 2000,
        endsAt: T0 + 482_000,
        pausedAt: null,
        status: "running",
      },
    ]);
  });

  it("ignores a duplicate timer id or a second active timer on the same step", () => {
    const { state } = play([...cooking, boilTimer(2000), boilTimer(3000), boilTimer(4000, "t-boil-2")]);
    expect(state.timers).toHaveLength(1);
    expect(state.timers[0].startedAt).toBe(T0 + 2000);
  });

  it("allows restarting a step's timer after cancelling it", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [3000, { type: "timer_cancelled", timerId: "t-boil" }],
      boilTimer(4000, "t-boil-2"),
    ]);
    expect(state.timers.map((t) => [t.id, t.status])).toEqual([
      ["t-boil", "cancelled"],
      ["t-boil-2", "running"],
    ]);
  });

  it("ignores timers for invalid steps or with no duration", () => {
    const [, base] = boilTimer(2000);
    const { state } = play([
      ...cooking,
      [2000, { ...base, stepIndex: 99, timerId: "a" } as EventInput],
      [2000, { ...base, seconds: 0, timerId: "b" } as EventInput],
    ]);
    expect(state.timers).toEqual([]);
  });

  it("ignores timer_started during mise", () => {
    const { state } = play([[0, { type: "session_started" }], boilTimer(100)]);
    expect(state.timers).toEqual([]);
  });

  it("runs finish → ringing → acknowledged → done", () => {
    const { state: ringing } = play([
      ...cooking,
      boilTimer(2000),
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
    ]);
    expect(ringing.timers[0].status).toBe("ringing");
    const { state: done } = play([
      ...cooking,
      boilTimer(2000),
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
      [490_000, { type: "timer_acknowledged", timerId: "t-boil" }],
    ]);
    expect(done.timers[0].status).toBe("done");
  });

  it("ignores lifecycle events for missing timers or the wrong status", () => {
    const base = [...cooking, boilTimer(2000)];
    const { state: expected } = play(base);
    const strip = (s: PlayerState) => ({ ...s, applied: {} });
    for (const extra of [
      { type: "timer_finished", timerId: "nope" },
      { type: "timer_cancelled", timerId: "nope" },
      { type: "timer_acknowledged", timerId: "nope" },
      { type: "timer_acknowledged", timerId: "t-boil" },
    ] satisfies EventInput[]) {
      const { state } = play([...base, [3000, extra]]);
      expect(strip(state)).toEqual(strip(expected));
      expect(Object.keys(state.applied)).toHaveLength(3);
    }
    const { state: cancelled } = play([
      ...base,
      [3000, { type: "timer_cancelled", timerId: "t-boil" }],
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
    ]);
    expect(cancelled.timers[0].status).toBe("cancelled");
  });

  it("completing a step leaves its background timer running", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [3000, { type: "step_completed", stepIndex: 0 }],
      [3000, { type: "step_entered", stepIndex: 1 }],
    ]);
    expect(state.timers[0].status).toBe("running");
  });

  it("does not hard-block leaving a step with a running stay timer", () => {
    const { state } = play([
      ...cooking,
      [2000, { type: "step_entered", stepIndex: 3 }],
      [
        2000,
        {
          type: "timer_started",
          timerId: "t-onion",
          stepIndex: 3,
          endsAt: T0 + 242_000,
          seconds: 240,
          label: "Sweat onion",
          mode: "stay",
        },
      ],
      [3000, { type: "step_entered", stepIndex: 4 }],
    ]);
    expect(state.currentStep).toBe(4);
    expect(state.timers[0].status).toBe("running");
  });

  it("finishing the session cancels running timers and settles ringing ones", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [2000, { type: "step_entered", stepIndex: 5 }],
      [
        2000,
        {
          type: "timer_started",
          timerId: "t-sauce",
          stepIndex: 5,
          endsAt: T0 + 2000 + 600_000,
          seconds: 600,
          label: "Sauce simmering",
          mode: "background",
        },
      ],
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
      [483_000, { type: "session_finished" }],
    ]);
    expect(state.timers.map((t) => t.status)).toEqual(["done", "cancelled"]);
  });
});

describe("pause", () => {
  it("freezes running timers and shifts endsAt by the paused duration on resume", () => {
    const { state: paused } = play([
      ...cooking,
      boilTimer(2000),
      [62_000, { type: "session_paused" }],
    ]);
    expect(paused.paused).toBe(true);
    expect(paused.pausedAt).toBe(T0 + 62_000);
    expect(paused.timers[0].pausedAt).toBe(T0 + 62_000);
    expect(paused.timers[0].endsAt).toBe(T0 + 482_000);

    const { state: resumed } = play([
      ...cooking,
      boilTimer(2000),
      [62_000, { type: "session_paused" }],
      [92_000, { type: "session_resumed" }],
    ]);
    expect(resumed.paused).toBe(false);
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.pausedMs).toBe(30_000);
    expect(resumed.timers[0].pausedAt).toBeNull();
    expect(resumed.timers[0].endsAt).toBe(T0 + 512_000);
  });

  it("does not shift ringing or cancelled timers", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
      [500_000, { type: "session_paused" }],
      [600_000, { type: "session_resumed" }],
    ]);
    expect(state.timers[0].endsAt).toBe(T0 + 482_000);
    expect(state.timers[0].status).toBe("ringing");
  });

  it("ignores double pause, resume without pause, and resume before the pause time", () => {
    const { state } = play([
      ...cooking,
      [2000, { type: "session_resumed" }],
      [3000, { type: "session_paused" }],
      [4000, { type: "session_paused" }],
      [2500, { type: "session_resumed" }],
    ]);
    expect(state.paused).toBe(true);
    expect(state.pausedAt).toBe(T0 + 3000);
    expect(Object.keys(state.applied)).toHaveLength(3);
  });

  it("ignores step changes, new timers and timer_finished while paused", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [3000, { type: "session_paused" }],
      [4000, { type: "step_entered", stepIndex: 1 }],
      [4000, { type: "step_completed", stepIndex: 0 }],
      [500_000, { type: "timer_finished", timerId: "t-boil" }],
    ]);
    expect(state.currentStep).toBe(0);
    expect(state.completed).toEqual([]);
    expect(state.timers[0].status).toBe("running");
  });

  it("still allows cancelling and acknowledging timers while paused", () => {
    const { state } = play([
      ...cooking,
      boilTimer(2000),
      [3000, { type: "session_paused" }],
      [4000, { type: "timer_cancelled", timerId: "t-boil" }],
    ]);
    expect(state.timers[0].status).toBe("cancelled");
  });

  it("finishing while paused closes out the paused span", () => {
    const { state } = play([
      ...cooking,
      [10_000, { type: "session_paused" }],
      [40_000, { type: "session_finished" }],
    ]);
    expect(state.paused).toBe(false);
    expect(state.pausedAt).toBeNull();
    expect(state.pausedMs).toBe(30_000);
  });
});

describe("idempotency and purity", () => {
  it("re-applying an already-applied event id is a no-op", () => {
    const { state, events } = play([...cooking, boilTimer(2000), [3000, { type: "step_entered", stepIndex: 1 }]]);
    for (const e of events) expect(reduce(state, e)).toBe(state);
    const resent = { ...events[3], stepIndex: 4 } as PlayerEvent;
    expect(reduce(state, resent)).toBe(state);
  });

  it("ignored events return the same state reference", () => {
    const { state } = play(cooking);
    const ev = eventFactory();
    expect(reduce(state, { ...ev(T0, { type: "step_entered", stepIndex: 99 }), id: "x" })).toBe(state);
  });

  it("never mutates its input", () => {
    const { events } = play([
      ...cooking,
      boilTimer(2000),
      [3000, { type: "session_paused" }],
      [4000, { type: "session_resumed" }],
      [5000, { type: "step_completed", stepIndex: 0 }],
      [482_000, { type: "timer_finished", timerId: "t-boil" }],
      [490_000, { type: "session_finished", rating: 5 }],
    ]);
    let s = deepFreeze(initialState(DEMO_RECIPE));
    for (const e of events) s = deepFreeze(reduce(s, deepFreeze(e)));
    expect(s.phase).toBe("finished");
  });

  it("accepts a batch of events, as returned by commands", () => {
    const { state, events } = play([...cooking, boilTimer(2000)]);
    expect(reduce(initialState(DEMO_RECIPE), events)).toEqual(state);
  });
});
