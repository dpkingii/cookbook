export function TechniqueChips({ techniques }: { techniques: readonly string[] }) {
  if (techniques.length === 0) return null;
  return (
    <ul aria-label="Techniques" className="flex flex-wrap gap-x-3 gap-y-1 text-sm capitalize text-[var(--mute)]">
      {techniques.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
