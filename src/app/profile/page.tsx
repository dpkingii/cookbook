import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { ring } from "@/components/site/focus";
import { LogoutButton } from "@/components/site/LogoutButton";
import { formatCompact, plural } from "@/components/stats/format";
import { StatTiles } from "@/components/stats/StatTiles";
import { WeekBoxes } from "@/components/stats/WeekBoxes";
import { thisWeek } from "@/components/stats/week";
import { buttonGhost, buttonPrimary } from "@/components/ui/styles";
import { getViewer } from "@/lib/auth/viewer";
import { TECHNIQUES } from "@/lib/recipe/types";
import { listSessions, toFinished } from "@/lib/sessions/queries";
import { techniqueCounts, totals, weeklyStreak } from "@/lib/stats";
import { viewerTimeZone } from "@/lib/stats/viewer-time-zone";

export const metadata = { title: "Profile" };

const LINKS = [
  {
    href: "/history",
    name: "History",
    note: "Every cook, with the time each step took.",
  },
  { href: "/skills", name: "Skills", note: "Techniques, cuisines and pace." },
  {
    href: "/my",
    name: "My recipes",
    note: "Recipes you added, and your favourites.",
  },
  {
    href: "/recipes/new",
    name: "New recipe",
    note: "Paste a recipe or a link to cook it step by step.",
  },
];

export default async function ProfilePage() {
  const viewer = await getViewer();
  const entries = viewer ? await listSessions(viewer.id) : [];
  const finished = entries.map(toFinished).filter((s) => s !== null);
  const now = new Date();
  const tz = await viewerTimeZone();
  const week = thisWeek(finished, now, tz);
  const tried = techniqueCounts(finished).filter((t) => t.count > 0).length;
  const days = week.cooked.filter(Boolean).length;
  const member = viewer && !viewer.isGuest ? viewer : null;

  return (
    <AppShell>
      <p className="label-caps">Profile</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
        {member ? (member.name ?? member.email) : "Guest"}
      </h1>

      <div className="mt-6">
        <StatTiles
          tiles={[
            {
              label: "Streak",
              value: String(weeklyStreak(finished, now, tz).current),
              unit: "weeks",
            },
            { label: "This week", value: formatCompact(week.seconds) },
            { label: "Dishes", value: String(totals(finished).recipes) },
            {
              label: "Techniques",
              value: String(tried),
              unit: `of ${TECHNIQUES.length}`,
            },
          ]}
        />
      </div>

      <div className="lg:mt-12 lg:grid lg:grid-cols-2 lg:content-start lg:gap-x-16">
        <section aria-labelledby="week" className="mt-8 lg:col-start-1 lg:mt-0">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="week" className="label-caps">
              This week
            </h2>
            <p className="text-sm text-[var(--mute)]">Days cooked: {days} of 7</p>
          </div>
          <div className="mt-3">
            <WeekBoxes cooked={week.cooked} today={week.today} />
          </div>
        </section>

        <nav
          aria-label="More"
          className="mt-10 border-b border-[var(--rule)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`group flex min-h-16 items-center justify-between gap-4 border-t border-[var(--rule)] py-3 ${ring}`}
            >
              <span>
                <span className="block font-serif text-xl font-medium group-hover:underline group-hover:decoration-[var(--rule)] group-hover:underline-offset-4">
                  {l.name}
                </span>
                <span className="block text-sm text-[var(--mute)]">{l.note}</span>
              </span>
              <span aria-hidden className="text-[var(--mute)]">
                &rarr;
              </span>
            </Link>
          ))}
        </nav>

        <section aria-labelledby="account" className="mt-10 lg:col-start-1">
          <h2 id="account" className="label-caps">
            Account
          </h2>
          {member ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="min-w-0 truncate text-base">{member.email}</p>
              <LogoutButton />
            </div>
          ) : (
            <>
              <p className="mt-3 max-w-md text-base text-[var(--mute)]">
                {finished.length > 0
                  ? `Your ${plural(finished.length, "cook")} ${finished.length === 1 ? "is" : "are"} kept`
                  : "Your progress is kept"}{" "}
                on this device until you sign up. Sign up to keep it on every device and to save your own recipes.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/signup" className={buttonPrimary}>
                  Sign up
                </Link>
                <Link href="/login" className={buttonGhost}>
                  Log in
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
