import { Heart } from "lucide-react";
import Link from "next/link";
import type { RecipeRow } from "@/lib/db/browse";
import { plural } from "@/components/stats/format";
import { ring } from "./focus";

function meta(r: RecipeRow, showVisibility: boolean) {
  return [
    r.cuisine,
    r.difficulty,
    `${r.minutes} min`,
    plural(r.steps, "step"),
    r.cooked > 0 && `cooked ${plural(r.cooked, "time")}`,
    showVisibility && (r.isPublic ? "public" : "private"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function RecipeList({
  rows,
  showVisibility = false,
  columns = false,
}: {
  rows: RecipeRow[];
  showVisibility?: boolean;
  columns?: boolean;
}) {
  return (
    <ul className={`border-b border-[var(--rule)] ${columns ? "md:grid md:grid-cols-2 md:gap-x-10" : ""}`}>
      {rows.map((r) => (
        <li key={r.id} className="border-t border-[var(--rule)]">
          <Link
            href={`/recipes/${r.id}`}
            className={`group flex min-h-16 items-start justify-between gap-3 py-3 ${ring}`}
          >
            <span className="min-w-0">
              <span className="block font-serif text-xl font-medium leading-snug group-hover:underline group-hover:decoration-[var(--rule)] group-hover:underline-offset-4">
                {r.title}
              </span>
              <span className="mt-0.5 block text-sm text-[var(--mute)]">{meta(r, showVisibility)}</span>
            </span>
            {r.favorited && (
              <>
                <Heart aria-hidden size={16} className="mt-2 shrink-0 fill-[var(--ink)] text-[var(--ink)]" />
                <span className="sr-only">Favourite</span>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
