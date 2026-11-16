import Link from "next/link";
import { buttonPrimary } from "@/components/ui/styles";

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10 border-t border-[var(--rule)] pt-6">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      <p className="mt-2 max-w-md text-base text-[var(--mute)]">{children}</p>
      <Link href="/" className={`${buttonPrimary} mt-6`}>
        Pick a recipe
      </Link>
    </div>
  );
}
