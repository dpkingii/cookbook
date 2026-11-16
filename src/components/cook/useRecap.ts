import { useEffect, useState } from "react";
import type { Recap } from "@/lib/stats/recap";

export type RecapState = { status: "loading" } | { status: "ready"; recap: Recap } | { status: "offline" };

const RETRY_MS = 8000;

/** Waits for the finishing events to reach the server, then asks it for the recap. Retries when the browser comes back online. */
export function useRecap({
  enabled,
  flush,
  sessionId,
}: {
  enabled: boolean;
  flush: () => Promise<boolean>;
  sessionId: () => string;
}): RecapState {
  const [state, setState] = useState<RecapState>({ status: "loading" });
  const { status } = state;

  useEffect(() => {
    if (!enabled || status === "ready") return;
    let cancelled = false;

    const load = async () => {
      try {
        if (!(await flush())) throw new Error("not flushed");
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(`/api/sessions/${sessionId()}/recap?tz=${encodeURIComponent(tz)}`);
        if (!response.ok) throw new Error(`recap ${response.status}`);
        const recap: Recap = await response.json();
        if (!cancelled) setState({ status: "ready", recap });
      } catch {
        if (!cancelled) setState({ status: "offline" });
      }
    };

    if (status === "loading") void load();
    const retry = status === "offline" ? setInterval(load, RETRY_MS) : undefined;
    window.addEventListener("online", load);
    return () => {
      cancelled = true;
      clearInterval(retry);
      window.removeEventListener("online", load);
    };
  }, [enabled, status, flush, sessionId]);

  return state;
}
