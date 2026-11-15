export default function Loading() {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]" aria-busy="true">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
        <p className="sr-only" role="status">
          Loading recipes
        </p>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--paper-deep)]" />
        <div className="mt-4 h-14 max-w-2xl animate-pulse rounded-2xl bg-[var(--paper-deep)]" />
        <div className="mt-10 h-11 max-w-xl animate-pulse rounded-full bg-[var(--paper-deep)]" />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li
              key={i}
              className="h-72 animate-pulse rounded-3xl border-2 border-[var(--ink)]/20 bg-[var(--paper-deep)]"
            />
          ))}
        </ul>
      </main>
    </div>
  );
}
