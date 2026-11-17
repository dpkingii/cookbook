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
}: {
  rows: RecipeRow[];
  showVisibility?: boolean;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
      {rows.map((r) => (
        <li key={r.id} className="flex">
          <Link
            href={`/recipes/${r.id}`}
            className={`sheet group flex min-h-24 w-full items-start justify-between gap-3 px-4 py-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--room)] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 ${ring}`}
          >
            <span className="min-w-0">
              <span className="block font-serif text-xl font-medium leading-snug ">
                {r.title}
              </span>
              <span className="mt-1 block text-sm text-[var(--mute)]">{meta(r, showVisibility)}</span>
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
