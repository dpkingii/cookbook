"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  cook: "M3 12h13v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM16 13l6-2M8 8V5M12 8V4",
  profile: "M8 4h8v7H8zM4 20v-5h16v5",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="square">
      <path d={d} />
    </svg>
  );
}

const item =
  "grid min-h-14 place-items-center content-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--accent)]";

export function BottomNav() {
  const path = usePathname();
  const on = path === "/" ? "home" : path === "/cook" ? "cook" : path.startsWith("/profile") ? "profile" : null;
  const tone = (key: string) => (on === key ? "text-[var(--ink)]" : "text-[var(--mute)]");

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rule)] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-xl grid-cols-3 items-center px-2 py-1.5">
        <Link href="/" aria-current={on === "home" ? "page" : undefined} className={`${item} ${tone("home")}`}>
          <Icon d={icons.home} />
          Home
        </Link>
        <Link href="/cook" aria-current={on === "cook" ? "page" : undefined} className={`${item} text-[var(--ink)]`}>
          <span className="grid h-10 w-16 place-items-center bg-[var(--ink)] text-white">
            <Icon d={icons.cook} />
          </span>
          Cook
        </Link>
        <Link href="/profile" aria-current={on === "profile" ? "page" : undefined} className={`${item} ${tone("profile")}`}>
          <Icon d={icons.profile} />
          Profile
        </Link>
      </div>
    </nav>
  );
}
