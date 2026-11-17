import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { buttonPrimary } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <AppShell reading>
      <p className="label-caps">Page not found</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">That page is not here.</h1>
      <p className="mt-3 max-w-md text-base text-[var(--mute)]">
        The recipe may have been removed, or the link is mistyped.
      </p>
      <Link href="/" className={`${buttonPrimary} mt-8`}>
        Back to all recipes
      </Link>
    </AppShell>
  );
}
