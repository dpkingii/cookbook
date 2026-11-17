import Link from "next/link";
import { RATINGS } from "@/components/cook/ratings";
import { ring } from "@/components/site/focus";
import { photoUrl } from "@/lib/photos/client";
import { lastWith, type PastCook } from "@/lib/sessions/past-cook";
import { EmptyPlate } from "./EmptyPlate";

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

/** Every time the viewer has cooked this recipe, oldest on the left, so the row reads as progress. */
export function PastCooks({ cooks }: { cooks: PastCook[] }) {
  if (cooks.length === 0) return null;
  const note = lastWith(cooks, "note");
  const photos = cooks.filter((c) => c.photoVersion !== null).length;

  return (
    <section aria-labelledby="past" className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="past" className="label-caps">
          Your cooks · {cooks.length}
        </h2>
        {photos >= 2 && <p className="text-sm text-[var(--mute)]">First plate to latest</p>}
      </div>

      <ol className="-mx-5 mt-2 flex gap-4 overflow-x-auto px-5 pb-4 pt-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-1">
        {cooks.map((c, i) => (
          <li key={c.id} className={`w-36 shrink-0 ${TILT[i % TILT.length]} motion-reduce:rotate-0`}>
            <Link
              href={`/history/${c.id}`}
              className={`sheet block p-1.5 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none ${ring}`}
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-[var(--wash)]">
                {c.photoVersion !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private photo served by our own route
                  <img src={photoUrl(c.id, c.photoVersion)} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <EmptyPlate className="w-4/5 opacity-60" />
                )}
              </div>
              <span className="block px-1 pt-1.5 text-sm font-semibold">{c.when}</span>
              <span className="block px-1 pb-0.5 text-sm text-[var(--mute)]">
                {c.rating ? RATINGS[c.rating - 1] : "Not rated"}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {note && <LastNote note={note.note} when={note.when} />}
    </section>
  );
}

export function LastNote({ note, when, className = "" }: { note: string; when: string; className?: string }) {
  return (
    <figure className={`mt-2 border-l-2 border-[var(--ink)] pl-3 ${className}`}>
      <figcaption className="label-caps">Your note from {when}</figcaption>
      <blockquote className="mt-1 font-serif text-xl italic leading-snug">{note}</blockquote>
    </figure>
  );
}
