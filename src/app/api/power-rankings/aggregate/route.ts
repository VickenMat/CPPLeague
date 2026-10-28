import { NextResponse } from "next/server";

function unavailable() {
  return NextResponse.json(
    {
      error:
        "Community voting is not configured for this league. Personal rankings can be saved in your browser.",
    },
    { status: 503 },
  );
}
export const GET = unavailable;
export const POST = unavailable;
