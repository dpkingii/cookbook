import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveSession } from "@/lib/sessions/queries";

export async function GET(request: Request) {
  const recipeId = z.uuid().safeParse(new URL(request.url).searchParams.get("recipeId"));
  if (!recipeId.success) return NextResponse.json({ error: "recipeId must be a uuid" }, { status: 400 });

  const viewer = await getViewer();
  const active = viewer && (await getActiveSession(viewer.id, recipeId.data));
  return active ? NextResponse.json(active) : new NextResponse(null, { status: 204 });
}
