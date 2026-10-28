import { NextResponse } from "next/server";
import { getHistoryStatistics } from "../../../../../lib/history-statistics";
import { InputError } from "../../../../../lib/validation";
import { checkRateLimit } from "../../../../../lib/rate-limit";
export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-history", 30, 60_000);
  if (limited) return limited;
  try {
    return NextResponse.json(
      await getHistoryStatistics(new URL(req.url).searchParams),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InputError
            ? error.message
            : "Unable to load league history from ESPN. Please try again.",
      },
      { status: error instanceof InputError ? 400 : 502 },
    );
  }
}
