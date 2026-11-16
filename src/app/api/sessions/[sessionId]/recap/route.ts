import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { getRecap } from "@/lib/sessions/recap";
import { isTimeZone } from "@/lib/stats/recap";

const FAILURES = {
  not_found: { error: "Session not found", status: 404 },
  forbidden: { error: "Not your session", status: 403 },
  unfinished: { error: "Session is not finished yet", status: 409 },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const tz = new URL(request.url).searchParams.get("tz") ?? "UTC";
  if (!isTimeZone(tz)) return NextResponse.json({ error: "tz must be an IANA time zone" }, { status: 400 });

  const result = await getRecap({ viewerId: viewer.id, sessionId: (await params).sessionId, tz });
  if (result.ok) return NextResponse.json(result.recap);
  const { error, status } = FAILURES[result.reason];
  return NextResponse.json({ error }, { status });
}
