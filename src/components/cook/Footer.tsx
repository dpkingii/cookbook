import type { ReactNode } from "react";

/** The bottom bar of every cooking screen. The timer dock, when there is one, sits in the same sticky block so the two never overlap. */
export function Footer({ dock, children }: { dock?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 bg-white">
      {dock}
      <div className="border-t border-[var(--rule)]">
        <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-3 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
