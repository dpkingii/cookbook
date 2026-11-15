import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/history", label: "History" },
  { href: "/skills", label: "Skills" },
  { href: "/my", label: "My recipes" },
];

const navLink =
  "rounded-full px-3 py-1.5 text-base font-semibold hover:bg-[var(--paper-deep)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]";

export async function SiteHeader() {
  const viewer = await getViewer();
  const member = viewer && !viewer.isGuest ? viewer : null;

  return (
    <header className="border-b-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-serif text-2xl font-bold">
          Cookbook
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full flex-wrap gap-x-1 sm:order-none sm:w-auto">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {member ? (
            <>
              <span className="max-w-[10rem] truncate text-base font-semibold">{member.name ?? member.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-4 py-1.5 text-base font-bold text-[var(--paper)] shadow-[2px_2px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
