import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const disable = searchParams.get("disable");

  if (disable !== null) {
    (await draftMode()).disable();
    return NextResponse.json({ draftMode: false });
  }

  if (secret !== process.env.DRAFT_MODE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  (await draftMode()).enable();
  return NextResponse.json({ draftMode: true });
}
