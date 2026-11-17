import { cookies } from "next/headers";
import { isTimeZone } from "./recap";

/** The zone the browser reported in the `tz` cookie, or UTC before it has. */
export async function viewerTimeZone(): Promise<string> {
  const tz = decodeURIComponent((await cookies()).get("tz")?.value ?? "");
  return isTimeZone(tz) ? tz : "UTC";
}
