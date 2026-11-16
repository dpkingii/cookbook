const DAY_MS = 86_400_000;

interface Cook {
  finishedAt: Date;
  plausible: boolean;
  durationSeconds: number;
}

/**
 * Monday to Sunday of the week containing `now`, in UTC like the weekly streak.
 * 1970-01-01 was a Thursday, hence the +3.
 */
export function thisWeek(sessions: readonly Cook[], now: Date) {
  const today = Math.floor(now.getTime() / DAY_MS);
  const monday = today - ((today + 3) % 7);
  const cooked = Array.from({ length: 7 }, () => false);
  let seconds = 0;
  for (const s of sessions) {
    const offset = Math.floor(s.finishedAt.getTime() / DAY_MS) - monday;
    if (!s.plausible || offset < 0 || offset > 6) continue;
    cooked[offset] = true;
    seconds += s.durationSeconds;
  }
  return { cooked, today: today - monday, seconds };
}
