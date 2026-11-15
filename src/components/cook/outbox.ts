import type { PlayerEvent } from "@/lib/player";

export const OUTBOX_KEY = "cookbook:outbox";

const CHUNK = 100;
const BEACON_BYTES = 60_000;

export interface OutboxItem {
  sessionId: string;
  recipeId: string;
  from: number;
  events: PlayerEvent[];
}

export interface OutboxDeps {
  storage: Pick<Storage, "getItem" | "setItem">;
  fetch: typeof fetch;
  ensureViewer: () => Promise<void>;
}

export type FlushResult = "done" | "retry";

const endpoint = (sessionId: string) => `/api/sessions/${sessionId}/events`;
const bodyOf = (item: OutboxItem, events: PlayerEvent[]) =>
  JSON.stringify({ recipeId: item.recipeId, from: item.from, events });

/**
 * Events wait here until the server has acknowledged them. Delivery is at
 * least once; the server drops duplicates by event id.
 */
export function createOutbox({ storage, fetch: send, ensureViewer }: OutboxDeps) {
  let items: OutboxItem[] = [];
  try {
    const saved = JSON.parse(storage.getItem(OUTBOX_KEY) ?? "[]");
    if (Array.isArray(saved)) items = saved;
  } catch {
    // Unreadable storage just means nothing is queued.
  }

  const save = () => {
    try {
      storage.setItem(OUTBOX_KEY, JSON.stringify(items));
    } catch {
      // Full or blocked storage: events still go out while the page is open.
    }
  };

  let flushing: Promise<FlushResult> | null = null;
  let viewerReady = false;

  async function run(): Promise<FlushResult> {
    while (items.length > 0) {
      const item = items[0];
      const chunk = item.events.slice(0, CHUNK);
      let status: number;
      try {
        if (!viewerReady) {
          await ensureViewer();
          viewerReady = true;
        }
        const response = await send(endpoint(item.sessionId), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyOf(item, chunk),
        });
        status = response.status;
      } catch {
        return "retry";
      }

      if (status === 401) viewerReady = false;
      if (status === 401 || status === 408 || status === 429 || status >= 500) return "retry";

      // Any other answer is final: accepted, or rejected in a way resending cannot fix.
      item.events = item.events.slice(chunk.length);
      item.from += chunk.length;
      if (item.events.length === 0) items = items.filter((i) => i !== item);
      save();
    }
    return "done";
  }

  return {
    pending: () => items.reduce((n, i) => n + i.events.length, 0),

    push(sessionId: string, recipeId: string, from: number, events: PlayerEvent[]) {
      if (events.length === 0) return;
      const last = items.at(-1);
      if (last && last.sessionId === sessionId && last.from + last.events.length === from) {
        last.events = [...last.events, ...events];
      } else {
        items.push({ sessionId, recipeId, from, events });
      }
      save();
    },

    flush(): Promise<FlushResult> {
      flushing ??= run().finally(() => {
        flushing = null;
      });
      return flushing;
    },

    /** For `pagehide`: fire-and-forget requests that outlive the page. Nothing is dequeued, so a failure is retried next visit. */
    beacon() {
      let budget = BEACON_BYTES;
      for (const item of items) {
        for (let i = 0; i < item.events.length; i += CHUNK) {
          const chunk = item.events.slice(i, i + CHUNK);
          const body = JSON.stringify({ recipeId: item.recipeId, from: item.from + i, events: chunk });
          if (body.length > budget) return;
          budget -= body.length;
          send(endpoint(item.sessionId), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      }
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
