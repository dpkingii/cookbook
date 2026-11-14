import { describe, expect, it } from "vitest";
import { DEMO_RECIPE } from "@/lib/recipe/demo";
import * as player from "./index";
import type { CommandContext, PlayerEvent, PlayerState } from "./index";
import { sequentialIds } from "./testing";

const T0 = 1_700_000_000_000;
const sec = (s: number) => T0 + s * 1000;

type Action = (ctx: CommandContext) => PlayerEvent[];

const byLabel = (state: PlayerState, label: string) => state.timers.findLast((t) => t.label === label)!.id;
const ack = (label: string): Action => (c) => player.acknowledgeTimer(c, byLabel(c.state, label));

describe("playing the demo recipe start to finish", () => {
  it("handles overlapping background timers, a pause and resent events, and replays to the same state", () => {
    const makeId = sequentialIds("evt");
    const log: PlayerEvent[] = [];
    let state = player.initialState(DEMO_RECIPE);
    const checkpoints: Record<number, (s: PlayerState, now: number) => void> = {};

    const script: Record<number, Action[]> = {
      0: [player.start],
      5: DEMO_RECIPE.ingredients.map((i) => (c) => player.toggleMise(c, i.id)),
      20: [(c) => player.toggleMise(c, "basil")],
      30: [(c) => player.toggleMise(c, "basil")],
      90: [player.beginCooking, player.startStepTimer],
      100: [player.next],
      220: [player.next],
      300: [player.next],
      310: [player.startStepTimer],
      400: [player.pause],
      460: [player.resume],
      612: [ack("Sweat onion")],
      615: [player.next],
      620: [player.startStepTimer],
      640: [ack("Water to a boil")],
      666: [ack("Garlic")],
      670: [player.next],
      675: [player.startStepTimer],
      680: [player.next],
      690: [player.startStepTimer],
      700: [player.next],
      710: [player.back],
      712: [player.next],
      1235: [ack("Spaghetti")],
      1240: [player.next],
      1276: [ack("Sauce simmering")],
      1280: [player.startStepTimer],
      1341: [ack("Toss")],
      1345: [player.next],
      1400: [player.next],
      1410: [(c) => player.finish(c, { rating: 5, note: "Save more pasta water" })],
    };

    checkpoints[5] = (s) => expect(s.checked).toHaveLength(8);
    checkpoints[30] = (s) => expect(s.checked).toHaveLength(8);
    checkpoints[90] = (s) => {
      expect(s.phase).toBe("cooking");
      expect(player.stepProgress(s, DEMO_RECIPE, sec(90))).toBe(0);
    };
    checkpoints[100] = (s) => {
      expect(s.currentStep).toBe(1);
      expect(player.dockTimers(s).map((t) => t.label)).toEqual(["Water to a boil"]);
    };
    checkpoints[310] = (s) => expect(player.hasUnfinishedStayTimer(s)).toBe(true);
    checkpoints[430] = (s, now) => {
      expect(s.paused).toBe(true);
      expect(player.remainingMs(s.timers[1], now)).toBe(150_000);
      expect(player.elapsedMs(s, now)).toBe(400_000);
    };
    checkpoints[609] = (s) => expect(s.timers[1].status).toBe("running");
    checkpoints[610] = (s) => {
      expect(s.timers[1]).toMatchObject({ label: "Sweat onion", status: "ringing", endsAt: sec(610) });
      expect(player.hasUnfinishedStayTimer(s)).toBe(false);
    };
    checkpoints[630] = (s) => {
      expect(player.dockTimers(s)).toMatchObject([{ label: "Water to a boil", status: "ringing" }]);
      expect(player.ringingTimers(s).map((t) => t.label)).toEqual(["Water to a boil"]);
    };
    checkpoints[700] = (s) => {
      expect(s.currentStep).toBe(7);
      expect(player.dockTimers(s).map((t) => t.label)).toEqual(["Spaghetti", "Sauce simmering"]);
    };
    checkpoints[710] = (s) => {
      expect(s.currentStep).toBe(6);
      expect(player.dockTimers(s).map((t) => t.label)).toEqual(["Sauce simmering"]);
      expect(player.stepProgress(s, DEMO_RECIPE, sec(710))).toBeCloseTo(20 / 540);
    };
    checkpoints[1230] = (s) => expect(player.dockTimers(s)[0]).toMatchObject({ label: "Spaghetti", status: "ringing" });
    checkpoints[1400] = (s) => {
      expect(s.currentStep).toBe(9);
      expect(s.completed).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    };

    const resent = new Set([100, 700, 1240]);
    for (let s = 0; s <= 1415; s++) {
      const now = sec(s);
      const ctx = (): CommandContext => ({ state, recipe: DEMO_RECIPE, now, makeId });
      const due = player.tick(state, now, makeId);
      log.push(...due);
      state = player.reduce(state, due);
      for (const action of script[s] ?? []) {
        const events = action(ctx());
        expect(events.length, `action at ${s}s`).toBeGreaterThan(0);
        log.push(...events);
        state = player.reduce(state, events);
        if (resent.has(s)) {
          log.push(...events);
          expect(player.reduce(state, events)).toBe(state);
        }
      }
      checkpoints[s]?.(state, now);
    }

    expect(state.phase).toBe("finished");
    expect(state.timers.map((t) => [t.label, t.status])).toEqual([
      ["Water to a boil", "done"],
      ["Sweat onion", "done"],
      ["Garlic", "done"],
      ["Sauce simmering", "done"],
      ["Spaghetti", "done"],
      ["Toss", "done"],
    ]);
    expect(player.summary(state, DEMO_RECIPE)).toEqual({
      durationSeconds: 1410 - 60,
      techniques: ["boil", "chop", "mince", "saute", "simmer", "drain", "plate"],
      completedSteps: 10,
      totalSteps: 10,
      plausible: true,
    });

    expect(player.replay(DEMO_RECIPE, log)).toEqual(state);

    const fromServer = JSON.parse(JSON.stringify(log)) as PlayerEvent[];
    expect(player.replay(DEMO_RECIPE, fromServer)).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);

    const midway = log.findIndex((e) => e.type === "session_resumed");
    const reloaded = player.replay(DEMO_RECIPE, log.slice(0, midway + 1));
    expect(player.reduce(reloaded, log.slice(midway + 1))).toEqual(state);
  });
});
