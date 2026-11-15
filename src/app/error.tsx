"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--paper)] px-4 text-[var(--ink)]">
      <main className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
          Something went wrong
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">
          That page didn&rsquo;t load.
        </h1>
        <p className="mt-3 text-lg text-[var(--ink-soft)]">
          A cook in progress is saved on this device, so nothing you were doing is lost.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-6 py-3 text-lg font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border-2 border-[var(--ink)] px-6 py-3 text-lg font-bold"
          >
            Back to recipes
          </Link>
        </div>
      </main>
    </div>
  );
}
