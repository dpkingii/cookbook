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
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="square">
      <path d={d} />
    </svg>
  );
}

const focus = "focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--ink)]";
const tab = `grid min-h-14 place-items-center content-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] ${focus}`;
const row = `flex min-h-12 items-center gap-3 px-3 text-base ${focus}`;

const MORE = [
  { href: "/history", name: "History" },
  { href: "/skills", name: "Skills" },
  { href: "/my", name: "My recipes" },
  { href: "/recipes/new", name: "New recipe" },
];

/** A bottom bar on phones and a side rail from laptop width up. Only one of the two is ever displayed. */
export function MainNav() {
  const path = usePathname();
  const on = path === "/" ? "home" : path === "/cook" ? "cook" : path.startsWith("/profile") ? "profile" : null;
  const tone = (key: string) => (on === key ? "text-[var(--ink)]" : "text-[var(--mute)]");
  const current = (key: string) => (on === key ? ("page" as const) : undefined);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--ink)] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-3 items-center px-2 py-1.5">
          <Link href="/" aria-current={current("home")} className={`${tab} ${tone("home")}`}>
            <Icon d={icons.home} />
            Home
          </Link>
          <Link href="/cook" aria-current={current("cook")} className={`${tab} text-[var(--ink)]`}>
            <span className="grid h-10 w-16 place-items-center border-2 border-[var(--ink)] bg-[var(--tomato)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
              <Icon d={icons.cook} />
            </span>
            Cook
          </Link>
          <Link href="/profile" aria-current={current("profile")} className={`${tab} ${tone("profile")}`}>
            <Icon d={icons.profile} />
            Profile
          </Link>
        </div>
      </nav>

      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r-2 border-[var(--ink)] bg-white px-5 pb-6 pt-9 lg:flex"
      >
        <Link href="/" className={`px-3 font-serif text-3xl font-medium tracking-[-0.02em] ${focus}`}>
          Cookbook
        </Link>

        <Link
          href="/cook"
          aria-current={current("cook")}
          className={`mt-9 flex min-h-12 items-center gap-3 border-2 border-[var(--ink)] bg-[var(--tomato)] px-3 text-base font-bold text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]`}
        >
          <Icon d={icons.cook} />
          Cook
        </Link>

        <ul className="mt-6">
          {(
            [
              ["home", "/", "Home"],
              ["profile", "/profile", "Profile"],
            ] as const
          ).map(([key, href, name]) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={current(key)}
                className={`${row} ${
                  on === key ? "bg-[var(--ink)] font-semibold text-white" : "text-[var(--ink)] hover:bg-[var(--wash)]"
                }`}
              >
                <Icon d={icons[key]} />
                {name}
              </Link>
            </li>
          ))}
        </ul>

        <p className="label-caps mt-9 px-3">Yours</p>
        <ul className="mt-1">
          {MORE.map((l) => {
            const here = path === l.href || (l.href !== "/recipes/new" && path.startsWith(`${l.href}/`));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={here ? "page" : undefined}
                  className={`flex min-h-10 items-center px-3 text-base ${focus} ${
                    here ? "bg-[var(--ink)] font-semibold text-white" : "text-[var(--ink)] hover:bg-[var(--wash)]"
                  }`}
                >
                  {l.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
