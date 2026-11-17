import { TECHNIQUE_NOTES } from "@/lib/recipe/technique-notes";
import type { Technique } from "@/lib/recipe/types";

export function TechniqueChips({ techniques }: { techniques: readonly Technique[] }) {
  if (techniques.length === 0) return null;
  return (
    <ul aria-label="Techniques" className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--mute)]">
      {techniques.map((t) => (
        <li key={t}>{TECHNIQUE_NOTES[t].name}</li>
      ))}
    </ul>
  );
}
