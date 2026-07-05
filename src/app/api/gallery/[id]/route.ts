import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { patchGalleryShare } from "@/lib/galleryShare";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const [{ id }, session, body] = await Promise.all([
    context.params,
    auth(),
    request.json().catch(() => ({})),
  ]);
  const origin = request.nextUrl.origin;
  const result = await patchGalleryShare(id, body, session?.user ?? null, origin);

  if (!result.body) {
    return NextResponse.json({ error: "not_found" }, { status: result.status });
  }

  return NextResponse.json(result.body, { status: result.status });
}
