const formatters = new Map<string, { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat }>();

function inZone(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = {
      date: new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }),
      time: new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }),
    };
    formatters.set(tz, f);
  }
  return f;
}

export const formatDate = (d: Date, tz: string) => inZone(tz).date.format(d);
export const formatTime = (d: Date, tz: string) => inZone(tz).time.format(d);

export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "42m" or "1h 05m", for tiles where space is tight. */
export function formatCompact(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}
