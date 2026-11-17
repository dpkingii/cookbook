export interface Tile {
  label: string;
  value: string;
  unit?: string;
}

/** Four figures divided by hairlines: a 2x2 grid on phones, one row on laptops. */
export function StatTiles({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <dl className="sheet grid grid-cols-2 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={`border-[var(--rule)] px-4 py-5 lg:border-t-0 lg:py-6 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t" : ""} ${i > 0 ? "lg:border-l" : ""}`}
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
