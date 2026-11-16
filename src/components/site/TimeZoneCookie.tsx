"use client";

import { useEffect } from "react";

/** Tells the server which time zone to use for "today" and "this week" on the next request. */
export function TimeZoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
