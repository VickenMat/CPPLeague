import { NextResponse } from "next/server";
import { getLeagueSummary } from "../../../../../lib/getLeagueSummary";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { parseSeason } from "../../../../../lib/validation";
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
    const season = parseSeason(params.get("season"), String(currentSeason()));
    return NextResponse.json(await getLeagueSummary({ season }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load league";
    return NextResponse.json(
      { error: message },
      { status: /Invalid|Only/.test(message) ? 400 : 502 },
    );
  }
}
