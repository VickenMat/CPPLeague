import { validateLeagueReference } from "../../../../../lib/league";
import { NextResponse } from "next/server";
import { getLeagueRoster } from "../../../../../lib/league-roster";
import { HttpError } from "../../../../../lib/http";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import {
  InputError,
  parseNumericId,
  parseSeason,
  singleParam,
} from "../../../../../lib/validation";
export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-roster", 90, 60_000);
  if (limited) return limited;
  try {
    const params = new URL(req.url).searchParams;
    validateLeagueReference(params);
    const season = parseSeason(
      singleParam(params, "season"),
      process.env.ESPN_SEASON,
    );
    const teamId = parseNumericId(singleParam(params, "teamId"), "teamId", {
      minLength: 1,
      maxLength: 4,
    });
    return NextResponse.json(await getLeagueRoster(teamId, season), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error instanceof InputError
        ? 400
        : error instanceof HttpError && error.status === 404
          ? 404
          : 502;
    return NextResponse.json(
      {
        error:
          status === 502
            ? "Unable to load the roster from ESPN. Please try again."
            : (error as Error).message,
      },
      { status },
    );
  }
}
