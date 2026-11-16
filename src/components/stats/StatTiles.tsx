export interface Tile {
  label: string;
  value: string;
  unit?: string;
}

/** Four figures in a 2x2 grid divided by hairlines. */
export function StatTiles({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-[var(--rule)]">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={`px-1 py-5 ${i % 2 === 1 ? "border-l border-[var(--rule)] pl-5" : "pr-5"} ${i >= 2 ? "border-t border-[var(--rule)]" : ""}`}
        >
          <dt className="label-caps">{t.label}</dt>
          <dd className="mt-2 font-serif text-5xl font-medium leading-none tracking-[-0.03em] tabular-nums">
            {t.value}
            {t.unit && <span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-[var(--mute)]">{t.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
