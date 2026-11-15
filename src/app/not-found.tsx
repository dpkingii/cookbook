import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-16 sm:px-6 md:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
          Page not found
        </p>
        <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">
          That page isn&rsquo;t on the menu.
        </h1>
        <p className="mt-4 text-xl text-[var(--ink-soft)]">
          The recipe may have been removed, or the link is mistyped.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-10 py-4 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Back to all recipes
        </Link>
      </main>
    </div>
  );
}
