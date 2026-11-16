import { isTimeZone, localDay } from "@/lib/stats/recap";

interface Cook {
  finishedAt: Date;
  plausible: boolean;
  durationSeconds: number;
}

/**
 * Monday to Sunday of the week containing `now`, by calendar day in `tz`.
 * 1970-01-01 was a Thursday, hence the +3.
 */
export function thisWeek(sessions: readonly Cook[], now: Date, tz = "UTC") {
  const zone = isTimeZone(tz) ? tz : "UTC";
  const today = localDay(now, zone);
  const monday = today - ((today + 3) % 7);
  const cooked = Array.from({ length: 7 }, () => false);
  let seconds = 0;
  for (const s of sessions) {
    const offset = localDay(s.finishedAt, zone) - monday;
    if (!s.plausible || offset < 0 || offset > 6) continue;
    cooked[offset] = true;
    seconds += s.durationSeconds;
  }
  return { cooked, today: today - monday, seconds };
}
