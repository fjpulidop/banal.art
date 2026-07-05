import { NextResponse } from "next/server";
import { resolveShareToken } from "@/lib/galleryShare";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await resolveShareToken(token);

  if (!result.body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(result.body);
}
