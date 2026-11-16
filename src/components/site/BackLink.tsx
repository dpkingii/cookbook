import Link from "next/link";
import { ring } from "./focus";

export function BackLink({ href = "/profile", children = "Profile" }: { href?: string; children?: string }) {
  return (
    <Link href={href} className={`-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-[var(--mute)] hover:text-[var(--ink)] ${ring}`}>
      <span aria-hidden>&larr;</span>
      {children}
    </Link>
  );
}
