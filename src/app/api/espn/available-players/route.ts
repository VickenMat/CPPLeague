import { singleParam } from "../../../../../lib/validation";
import { validateLeagueReference } from "../../../../../lib/league";
import { NextResponse } from "next/server";
import { getAvailablePlayers } from "../../../../../lib/available-players";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { parseSeason } from "../../../../../lib/validation";

export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-available-players", 30, 60_000);
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  let leagueId: string;
  try {
    leagueId = validateLeagueReference(params);
  } catch {
    return NextResponse.json(
      { error: "Only the configured league is supported." },
      { status: 400 },
    );
  }
  let season: string;
  try {
    season = parseSeason(
      singleParam(params, "season"),
      process.env.ESPN_SEASON || String(new Date().getFullYear()),
    );
  } catch {
    return NextResponse.json({ error: "Invalid season." }, { status: 400 });
  }
  try {
    const result = await getAvailablePlayers(leagueId, season);
    return NextResponse.json(
      { ...result, season, leagueId, updatedAt: new Date().toISOString() },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to load the ESPN player pool. Please retry. If this continues, check the league credentials and season configuration.",
      },
      { status: 502 },
    );
  }
}
