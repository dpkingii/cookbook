import { describe, expect, it, vi } from "vitest";
import type { PlayerEvent } from "@/lib/player";
import { createOutbox, OUTBOX_KEY } from "./outbox";

const ev = (n: number): PlayerEvent => ({ type: "session_started", id: `e${n}`, at: n });
const many = (from: number, count: number) => Array.from({ length: count }, (_, i) => ev(from + i));

function setup(statuses: (number | Error)[] = []) {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  const calls: { url: string; body: { from: number; events: PlayerEvent[] }; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)), init: init! });
    const next = statuses.shift() ?? 200;
    if (next instanceof Error) throw next;
    return new Response(null, { status: next });
  });
  const ensureViewer = vi.fn(async () => {});
  const make = () => createOutbox({ storage, fetch: fetchMock as typeof fetch, ensureViewer });
  return { store, calls, ensureViewer, make, outbox: make() };
}

describe("outbox", () => {
  it("signs in once, posts the batch with its offset and empties the queue", async () => {
    const { outbox, calls, ensureViewer } = setup();
    outbox.push("s1", "r1", 0, [ev(1), ev(2)]);
    outbox.push("s1", "r1", 2, [ev(3)]);
    expect(await outbox.flush()).toBe("done");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/sessions/s1/events");
    expect(calls[0].body).toMatchObject({ from: 0, events: [ev(1), ev(2), ev(3)] });
    expect(outbox.pending()).toBe(0);

    outbox.push("s1", "r1", 3, [ev(4)]);
    await outbox.flush();
    expect(ensureViewer).toHaveBeenCalledTimes(1);
  });

  it("keeps events through a network error and a 500, then delivers them", async () => {
    const { outbox, calls } = setup([new TypeError("offline"), 503]);
    outbox.push("s1", "r1", 0, [ev(1)]);
    expect(await outbox.flush()).toBe("retry");
    expect(await outbox.flush()).toBe("retry");
    expect(outbox.pending()).toBe(1);
    expect(await outbox.flush()).toBe("done");
    expect(calls).toHaveLength(3);
    expect(outbox.pending()).toBe(0);
  });

  it("signs in again after a 401", async () => {
    const { outbox, ensureViewer } = setup([401]);
    outbox.push("s1", "r1", 0, [ev(1)]);
    expect(await outbox.flush()).toBe("retry");
    expect(await outbox.flush()).toBe("done");
    expect(ensureViewer).toHaveBeenCalledTimes(2);
  });

  it("retries when signing in fails", async () => {
    const { outbox, ensureViewer } = setup();
    ensureViewer.mockRejectedValueOnce(new Error("offline"));
    outbox.push("s1", "r1", 0, [ev(1)]);
    expect(await outbox.flush()).toBe("retry");
    expect(await outbox.flush()).toBe("done");
  });

  it("drops a batch the server will never accept so later ones still flow", async () => {
    const { outbox, calls } = setup([403]);
    outbox.push("bad", "r1", 0, [ev(1)]);
    outbox.push("good", "r1", 0, [ev(2)]);
    expect(await outbox.flush()).toBe("done");
    expect(calls.map((c) => c.url)).toEqual(["/api/sessions/bad/events", "/api/sessions/good/events"]);
    expect(outbox.pending()).toBe(0);
  });

  it("sends large backlogs in chunks of 100 with advancing offsets", async () => {
    const { outbox, calls } = setup();
    outbox.push("s1", "r1", 40, many(0, 250));
    await outbox.flush();
    expect(calls.map((c) => [c.body.from, c.body.events.length])).toEqual([
      [40, 100],
      [140, 100],
      [240, 50],
    ]);
  });

  it("shares one flush between concurrent callers", async () => {
    const { outbox, calls } = setup();
    outbox.push("s1", "r1", 0, [ev(1)]);
    await Promise.all([outbox.flush(), outbox.flush()]);
    expect(calls).toHaveLength(1);
  });

  it("survives a reload", async () => {
    const { outbox, make, store } = setup([500]);
    outbox.push("s1", "r1", 0, [ev(1), ev(2)]);
    await outbox.flush();
    expect(JSON.parse(store.get(OUTBOX_KEY)!)).toHaveLength(1);

    const reloaded = make();
    expect(reloaded.pending()).toBe(2);
    expect(await reloaded.flush()).toBe("done");
    expect(JSON.parse(store.get(OUTBOX_KEY)!)).toEqual([]);
  });

  it("beacons with keepalive and leaves the queue intact", () => {
    const { outbox, calls } = setup();
    outbox.push("s1", "r1", 0, [ev(1)]);
    outbox.beacon();
    expect(calls).toHaveLength(1);
    expect(calls[0].init.keepalive).toBe(true);
    expect(outbox.pending()).toBe(1);
  });

  it("starts empty when storage holds garbage", () => {
    const { store, make } = setup();
    store.set(OUTBOX_KEY, "{not json");
    expect(make().pending()).toBe(0);
  });
});
