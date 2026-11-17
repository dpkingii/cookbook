import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { MAX_PHOTO_BYTES } from "@/lib/photos/jpeg";
import { deletePhoto, getPhoto, savePhoto, type PhotoFailure } from "@/lib/photos/store";

type Context = { params: Promise<{ sessionId: string }> };

const FAILURES: Record<PhotoFailure, { error: string; status: number }> = {
  not_found: { error: "Session not found", status: 404 },
  forbidden: { error: "Not your session", status: 403 },
  too_large: { error: "Photo is too large", status: 413 },
  not_jpeg: { error: "Photo must be a JPEG", status: 415 },
};

export async function POST(request: Request, { params }: Context) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: FAILURES.too_large.error }, { status: 413 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  const result = await savePhoto({ viewerId: viewer.id, sessionId: (await params).sessionId, bytes });
  if (result.ok) return NextResponse.json({ version: result.version });
  const { error, status } = FAILURES[result.reason];
  return NextResponse.json({ error }, { status });
}

export async function GET(_request: Request, { params }: Context) {
  const viewer = await getViewer();
  const bytes = viewer && (await getPhoto(viewer.id, (await params).sessionId));
  if (!bytes) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  return new Response(bytes, {
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(bytes.length),
      // The address carries the upload time, so a replaced photo gets a new address.
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const removed = await deletePhoto(viewer.id, (await params).sessionId);
  return removed ? new Response(null, { status: 204 }) : NextResponse.json({ error: "Photo not found" }, { status: 404 });
}
