export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]" aria-busy="true">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
        <p className="sr-only" role="status">
          {label}
        </p>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--paper-deep)] motion-reduce:animate-none" />
        <div className="mt-4 h-14 max-w-md animate-pulse rounded-2xl bg-[var(--paper-deep)] motion-reduce:animate-none" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border-2 border-[var(--ink)]/20 bg-[var(--paper-deep)] motion-reduce:animate-none"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
