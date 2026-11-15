"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Warns before the page is left while `active`: tab close and reload, plus clicks on in-app links. */
export function useLeaveGuard(active: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (bypass.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => router.push(url.pathname + url.search + url.hash));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, router]);

  const ask = useCallback(
    (proceed: () => void) => {
      if (active) setPending(() => proceed);
      else proceed();
    },
    [active],
  );

  const setBypass = useCallback((on: boolean) => {
    bypass.current = on;
  }, []);

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    bypass.current = true;
    pending?.();
    setPending(null);
  }, [pending]);

  return { open: pending !== null, ask, setBypass, stay, leave };
}
