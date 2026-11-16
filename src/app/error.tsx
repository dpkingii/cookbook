"use client";

import Link from "next/link";
import { buttonGhost, buttonPrimary } from "@/components/ui/styles";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <main className="mx-auto max-w-xl px-5 pt-16 sm:px-6">
        <p className="label-caps">Something went wrong</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] sm:text-4xl">That page did not load.</h1>
        <p className="mt-3 max-w-md text-base text-[var(--mute)]">
          A cook in progress is saved on this device, so nothing you were doing is lost.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={buttonPrimary}>
            Try again
          </button>
          <Link href="/" className={buttonGhost}>
            Back to recipes
          </Link>
        </div>
      </main>
    </div>
  );
}
