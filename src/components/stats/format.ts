const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export const formatDate = (d: Date) => date.format(d);
export const formatTime = (d: Date) => time.format(d);

export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
