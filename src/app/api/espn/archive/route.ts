import { NextResponse } from "next/server";
import { getMatchupArchive } from "../../../../../lib/matchup-archive";
import { InputError } from "../../../../../lib/validation";
import { checkRateLimit } from "../../../../../lib/rate-limit";
export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-archive", 20, 60_000);
  if (limited) return limited;
  try {
    return NextResponse.json(
      await getMatchupArchive(new URL(req.url).searchParams),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InputError
            ? error.message
            : "Unable to load matchup records from ESPN. Please try again.",
      },
      { status: error instanceof InputError ? 400 : 502 },
    );
  }
}
