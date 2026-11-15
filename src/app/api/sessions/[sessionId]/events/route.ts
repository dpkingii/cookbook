import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { ingestEvents } from "@/lib/sessions/ingest";
import { ingestBody, type IngestBody } from "@/lib/sessions/schema";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const sessionId = z.uuid().safeParse((await params).sessionId);
  const body = ingestBody.safeParse(await request.json().catch(() => null));
  if (!sessionId.success || !body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = body.data as IngestBody;
  const result = await ingestEvents({ viewerId: viewer.id, sessionId: sessionId.data, ...input });
  if (result.ok) return NextResponse.json({ accepted: input.events.length, finished: result.finished });
  return result.reason === "forbidden"
    ? NextResponse.json({ error: "Not your session" }, { status: 403 })
    : NextResponse.json({ error: "Recipe not found" }, { status: 404 });
}
