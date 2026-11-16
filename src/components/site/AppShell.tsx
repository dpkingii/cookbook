import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TimeZoneCookie } from "./TimeZoneCookie";

/** Page frame for every screen that shows the bottom bar: one column, room for the bar underneath. */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <main className={`mx-auto px-5 pb-28 pt-6 sm:px-6 ${wide ? "max-w-4xl" : "max-w-xl"}`}>{children}</main>
      <BottomNav />
      <TimeZoneCookie />
    </div>
  );
}
