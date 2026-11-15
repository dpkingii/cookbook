export function TechniqueChips({ techniques }: { techniques: readonly string[] }) {
  if (techniques.length === 0) return null;
  return (
    <ul aria-label="Techniques" className="flex flex-wrap gap-2">
      {techniques.map((t) => (
        <li
          key={t}
          className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper-deep)] px-3 py-0.5 text-base capitalize"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}
