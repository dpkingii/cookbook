import { AppShell } from "./AppShell";

const block = "bg-[var(--wash)] motion-safe:animate-pulse";

export function PageSkeleton({ label, rows = 6 }: { label: string; rows?: number }) {
  return (
    <AppShell>
      <div aria-busy="true">
        <p className="sr-only" role="status">
          {label}
        </p>
        <div className={`h-3 w-20 ${block}`} />
        <div className={`mt-4 h-10 w-3/4 max-w-sm ${block}`} />
        <div className="mt-10 border-b border-[var(--rule)]">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="border-t border-[var(--rule)] py-4">
              <div className={`h-5 w-2/3 ${block}`} />
              <div className={`mt-2 h-3 w-1/2 ${block}`} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
