import { TECHNIQUES } from "@/lib/recipe/types";
import type { Technique } from "@/lib/recipe/types";
import type { FinishedSession } from "./index";

export interface Recap {
  session: { id: string; title: string; seconds: number; minutes: number; plausible: boolean };
  today: { before: number; after: number };
  week: { before: number; after: number };
  nth: { today: number | null; week: number | null };
  streak: { weeks: number; days: boolean[]; todayIndex: number };
  techniques: { items: { technique: Technique; count: number; first: boolean }[]; practised: number; total: number };
}

const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" });
    formatters.set(tz, f);
  }
  return f;
}

export function isTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** Whole days since 1970-01-01 of the calendar date `date` falls on in `tz`. */
export function localDay(date: Date, tz: string): number {
  const part = Object.fromEntries(formatter(tz).formatToParts(date).map((p) => [p.type, Number(p.value)]));
  return Date.UTC(part.year, part.month - 1, part.day) / DAY_MS;
}

/** 1970-01-01 was a Thursday, so Monday-based weeks and weekdays shift by 3. */
const weekOf = (day: number) => Math.floor((day + 3) / 7);
const weekdayOf = (day: number) => (day + 3) % 7;

const minutes = (seconds: number) => Math.round(seconds / 60);

interface Placed {
  session: FinishedSession;
  day: number;
}

export function buildRecap({
  sessions,
  sessionId,
  tz,
}: {
  sessions: readonly FinishedSession[];
  sessionId: string;
  tz: string;
}): Recap | null {
  const mine = sessions.find((s) => s.id === sessionId);
  if (!mine) return null;

  const until = sessions.filter((s) => s.id === mine.id || s.finishedAt <= mine.finishedAt);
  const placed: Placed[] = until.map((session) => ({ session, day: localDay(session.finishedAt, tz) }));
  const today = localDay(mine.finishedAt, tz);
  const thisWeek = weekOf(today);

  const counted = placed.filter((p) => p.session.plausible);
  const prior = counted.filter((p) => p.session.id !== mine.id);
  const sumMinutes = (list: Placed[]) => minutes(list.reduce((sum, p) => sum + p.session.durationSeconds, 0));

  const sameDay = (p: Placed) => p.day === today;
  const sameWeek = (p: Placed) => weekOf(p.day) === thisWeek;

  const weeks = new Set(counted.map((p) => weekOf(p.day)));
  let streak = 0;
  for (let w = weeks.has(thisWeek) ? thisWeek : thisWeek - 1; weeks.has(w); w--) streak++;

  const days = Array.from({ length: 7 }, () => false);
  for (const p of counted.filter(sameWeek)) days[weekdayOf(p.day)] = true;

  const tally = new Map<Technique, number>();
  for (const p of counted) for (const t of new Set(p.session.techniques)) tally.set(t, (tally.get(t) ?? 0) + 1);
  const items = mine.plausible
    ? [...new Set(mine.techniques)].map((technique) => {
        const count = tally.get(technique) ?? 0;
        return { technique, count, first: count === 1 };
      })
    : [];

  return {
    session: {
      id: mine.id,
      title: mine.title,
      seconds: mine.durationSeconds,
      minutes: minutes(mine.durationSeconds),
      plausible: mine.plausible,
    },
    today: { before: sumMinutes(prior.filter(sameDay)), after: sumMinutes(counted.filter(sameDay)) },
    week: { before: sumMinutes(prior.filter(sameWeek)), after: sumMinutes(counted.filter(sameWeek)) },
    nth: mine.plausible
      ? { today: counted.filter(sameDay).length, week: counted.filter(sameWeek).length }
      : { today: null, week: null },
    streak: { weeks: streak, days, todayIndex: weekdayOf(today) },
    techniques: { items, practised: tally.size, total: TECHNIQUES.length },
  };
}
