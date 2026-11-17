import type { ReactNode } from "react";
import { MainNav } from "./MainNav";
import { TimeZoneCookie } from "./TimeZoneCookie";

/**
 * Page frame for every screen with the main navigation: one column above the
 * bottom bar on phones, a wide canvas beside the side rail on laptops.
 * `reading` keeps long single-column pages at a comfortable line length. `tone` is the room's colour.
 */
export type Tone = "sun" | "tomato" | "mint" | "sky" | "pink" | "lilac";

export function AppShell({ children, tone, reading = false }: { children: ReactNode; tone: Tone; reading?: boolean }) {
  return (
    <div data-tone={tone} className="min-h-dvh bg-[var(--bg)] text-[var(--ink)] lg:pl-60">
      <main
        className={`mx-auto max-w-xl px-5 pb-28 pt-6 sm:px-6 lg:mx-0 lg:px-12 lg:pb-16 lg:pt-10 ${
          reading ? "lg:max-w-3xl" : "lg:max-w-6xl"
        }`}
      >
        {children}
      </main>
      <MainNav />
      <TimeZoneCookie />
    </div>
  );
}
