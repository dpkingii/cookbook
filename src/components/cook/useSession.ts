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
import { ensureViewer } from "@/lib/auth/client";
import { chime } from "@/lib/kitchen/chime";
import { createOutbox, type Outbox } from "./outbox";

const makeId = () => crypto.randomUUID();
const storageKey = (recipe: Recipe) => `cookbook:session:${recipe.id}`;
const RESUME_TIMEOUT_MS = 2500;
/** A finished cook reopens on its recap only for a short while, so a reload mid-recap still works but coming back later starts a new cook. */
const RECAP_WINDOW_MS = 15 * 60_000;

const finishedLongAgo = (recipe: Recipe, events: PlayerEvent[], now: number) =>
  reduce(initialState(recipe), events).phase === "finished" && now - (events.at(-1)?.at ?? 0) > RECAP_WINDOW_MS;

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

interface Journal {
  id: string;
  events: PlayerEvent[];
}

const storage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or full storage: the session still runs, it just won't survive a reload.
    }
  },
};

/** Sessions saved before the server existed were a bare event array; they get an id and are uploaded once. */
function loadJournal(recipe: Recipe): { journal: Journal; unsynced: boolean } | null {
  try {
    const saved = JSON.parse(storage.getItem(storageKey(recipe)) ?? "null");
    if (Array.isArray(saved)) return saved.length > 0 ? { journal: { id: makeId(), events: saved }, unsynced: true } : null;
    return typeof saved?.id === "string" && Array.isArray(saved.events) ? { journal: saved, unsynced: false } : null;
  } catch {
    return null;
  }
}

async function fetchActive(recipe: Recipe): Promise<Journal | null> {
  try {
    const response = await fetch(`/api/sessions/active?recipeId=${recipe.id}`, {
      signal: AbortSignal.timeout(RESUME_TIMEOUT_MS),
    });
    if (response.status !== 200) return null;
    const { sessionId, events } = await response.json();
    return { id: sessionId, events };
  } catch {
    return null;
  }
}

let outbox: Outbox | null = null;
const getOutbox = () => (outbox ??= createOutbox({ storage, fetch: (...args) => fetch(...args), ensureViewer }));

let attempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/** A failed flush never blocks cooking: it just tries again later, backing off up to a minute. */
function sync() {
  clearTimeout(retryTimer);
  void getOutbox()
    .flush()
    .then((result) => {
      if (result === "done") {
        attempts = 0;
        return;
      }
      retryTimer = setTimeout(sync, Math.min(60_000, 1000 * 2 ** attempts++));
    });
}

export function useSession(recipe: Recipe) {
  const [session, dispatch] = useReducer(sessionReducer, recipe, blank);
  const { ready } = session;
  const journal = useRef<Journal>({ id: "", events: [] });
  const stateRef = useRef(session.player);

  const adopt = useCallback(
    (next: Journal, queue: boolean) => {
      journal.current = next;
      stateRef.current = reduce(initialState(recipe), next.events);
      storage.setItem(storageKey(recipe), JSON.stringify(next));
      if (queue) {
        getOutbox().push(next.id, recipe.id, 0, next.events);
        sync();
      }
      dispatch({ events: next.events, now: Date.now(), reset: recipe });
    },
    [recipe],
  );

  const record = useCallback(
    (events: PlayerEvent[], now: number) => {
      if (events.length > 0) {
        const { id, events: logged } = journal.current;
        journal.current = { id, events: [...logged, ...events] };
        storage.setItem(storageKey(recipe), JSON.stringify(journal.current));
        stateRef.current = reduce(stateRef.current, events);
        getOutbox().push(id, recipe.id, logged.length, events);
        sync();
      }
      dispatch({ events, now });
    },
    [recipe],
  );

  const startFresh = useCallback(() => {
    const id = makeId();
    adopt({ id, events: [] }, false);
    record(start({ state: initialState(recipe), recipe, now: Date.now(), makeId }), Date.now());
  }, [adopt, record, recipe]);

  useEffect(() => {
    const saved = loadJournal(recipe);
    if (saved && finishedLongAgo(recipe, saved.journal.events, Date.now())) {
      if (saved.unsynced) adopt(saved.journal, true);
      startFresh();
      return;
    }
    if (saved) {
      adopt(saved.journal, saved.unsynced);
      return;
    }
    let cancelled = false;
    void fetchActive(recipe).then((remote) => {
      if (cancelled) return;
      if (remote && remote.events.length > 0) adopt(remote, false);
      else startFresh();
    });
    return () => {
      cancelled = true;
    };
  }, [recipe, adopt, startFresh]);

  useEffect(() => {
    sync();
    const flushNow = () => {
      attempts = 0;
      sync();
    };
    const beacon = () => getOutbox().beacon();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") beacon();
    };
    window.addEventListener("online", flushNow);
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", flushNow);
      window.removeEventListener("pagehide", beacon);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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

  /** Resolves true once the server has acknowledged every queued event, false if it could not be reached. */
  const flush = useCallback(async () => {
    const result = await getOutbox().flush();
    return result === "done" && getOutbox().pending() === 0;
  }, []);

  const run = useCallback(
    (command: (ctx: CommandContext) => PlayerEvent[]) => {
      const now = Date.now();
      record(command({ state: stateRef.current, recipe, now, makeId }), now);
    },
    [recipe, record],
  );

  const sessionId = useCallback(() => journal.current.id, []);

  return { state: session.player, now: session.now, ready, run, flush, sessionId };
}
