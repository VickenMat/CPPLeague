import { NextResponse } from "next/server";
import { getLeagueSummary } from "../../../../../lib/getLeagueSummary";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { parseSeason, singleParam } from "../../../../../lib/validation";
import {
  currentSeason,
  validateLeagueReference,
} from "../../../../../lib/league";

export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-summary", 120, 60_000);
  if (limited) return limited;
  try {
    const params = new URL(req.url).searchParams;
    validateLeagueReference(params);
    const season = parseSeason(
      singleParam(params, "season"),
      String(currentSeason()),
    );
    return NextResponse.json(await getLeagueSummary({ season }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load league";
    return NextResponse.json(
      { error: message },
      { status: /Invalid|Only/.test(message) ? 400 : 502 },
    );
  }
}
