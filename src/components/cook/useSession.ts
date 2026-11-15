"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Recipe } from "@/lib/recipe/types";
import {
  initialState,
  reduce,
  start,
  tick,
  type CommandContext,
  type PlayerEvent,
  type PlayerState,
} from "@/lib/player";
import { chime } from "@/lib/kitchen/chime";

const makeId = () => crypto.randomUUID();
const storageKey = (recipe: Recipe) => `cookbook:session:${recipe.id}`;

interface Session {
  player: PlayerState;
  now: number;
  ready: boolean;
}

type Action = { events: PlayerEvent[]; now: number; reset?: Recipe };

function sessionReducer(session: Session, action: Action): Session {
  const base = action.reset ? initialState(action.reset) : session.player;
  return { player: reduce(base, action.events), now: action.now, ready: true };
}

const blank = (recipe: Recipe): Session => ({ player: initialState(recipe), now: 0, ready: false });

function loadEvents(recipe: Recipe): PlayerEvent[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(recipe)) ?? "[]");
  } catch {
    return [];
  }
}

export function useSession(recipe: Recipe) {
  const [session, dispatch] = useReducer(sessionReducer, recipe, blank);
  const { ready } = session;
  const log = useRef<PlayerEvent[]>([]);
  const stateRef = useRef(session.player);

  const record = useCallback(
    (events: PlayerEvent[], now: number, reset?: Recipe) => {
      if (reset) {
        log.current = [];
        stateRef.current = initialState(reset);
      }
      if (events.length > 0) {
        log.current = [...log.current, ...events];
        try {
          localStorage.setItem(storageKey(recipe), JSON.stringify(log.current));
        } catch {
          // Private mode or full storage: the session still runs, it just won't survive a reload.
        }
        stateRef.current = reduce(stateRef.current, events);
      }
      dispatch({ events, now, reset });
    },
    [recipe],
  );

  const begin = useCallback(
    (saved: PlayerEvent[]) => {
      const now = Date.now();
      const events =
        saved.length > 0 ? saved : start({ state: initialState(recipe), recipe, now, makeId });
      record(events, now, recipe);
    },
    [recipe, record],
  );

  useEffect(() => begin(loadEvents(recipe)), [recipe, begin]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const now = Date.now();
      const due = tick(stateRef.current, now, makeId);
      record(due, now);
      if (due.length > 0) chime();
    }, 250);
    return () => clearInterval(id);
  }, [ready, record]);

  const run = useCallback(
    (command: (ctx: CommandContext) => PlayerEvent[]) => {
      const now = Date.now();
      record(command({ state: stateRef.current, recipe, now, makeId }), now);
    },
    [recipe, record],
  );

  const restart = useCallback(() => begin([]), [begin]);

  return { state: session.player, now: session.now, ready, run, restart };
}
