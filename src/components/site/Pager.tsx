import Link from "next/link";

export const PAGE_SIZE = 24;

export function paginate<T>(items: T[], pageParam: string | undefined) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1));
  return { page, pages, items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

const link =
  "inline-flex min-h-11 items-center rounded-full border-2 border-[var(--ink)] px-5 text-lg font-semibold hover:bg-[var(--paper-deep)]";

export function Pager({
  page,
  pages,
  params,
}: {
  page: number;
  pages: number;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (n > 1) query.set("page", String(n));
    const text = query.toString();
    return text ? `?${text}` : "?";
  };

  return (
    <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center gap-3">
      {page > 1 && (
        <Link href={href(page - 1)} className={link}>
          Previous
        </Link>
      )}
      <p className="text-lg text-[var(--ink-soft)]">
        Page {page} of {pages}
      </p>
      {page < pages && (
        <Link href={href(page + 1)} className={link}>
          Next
        </Link>
      )}
    </nav>
  );
}
