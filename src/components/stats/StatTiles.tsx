export interface Tile {
  label: string;
  value: string;
  unit?: string;
}

/** Four figures divided by hairlines: a 2x2 grid on phones, one row on laptops. */
export function StatTiles({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-[var(--rule)] lg:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={`border-[var(--rule)] px-1 py-5 lg:border-t-0 lg:py-7 lg:pr-5 ${i % 2 === 1 ? "border-l pl-5" : "pr-5"} ${i >= 2 ? "border-t" : ""} ${i > 0 ? "lg:border-l lg:pl-6" : ""}`}
        >
          <dt className="label-caps">{t.label}</dt>
          <dd className={`mt-2 whitespace-nowrap font-serif font-medium leading-none tracking-[-0.03em] tabular-nums ${t.value.length > 4 ? "pt-3 text-4xl" : "text-5xl"}`}>
            {t.value}
            {t.unit && <span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-[var(--mute)]">{t.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
