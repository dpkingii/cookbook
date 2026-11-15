import Link from "next/link";

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10 max-w-xl rounded-3xl border-2 border-dashed border-[var(--ink)] p-6 sm:p-8">
      <h2 className="font-serif text-3xl font-semibold leading-tight">{title}</h2>
      <p className="mt-3 text-xl text-[var(--ink-soft)]">{children}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] px-6 py-3 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        Pick a recipe
      </Link>
    </div>
  );
}
