import { NextResponse } from "next/server";
import { getEspnLeagueId } from "../../../../../lib/espn";
import { currentSeason } from "../../../../../lib/league";

export async function GET() {
  return NextResponse.json({
    season: currentSeason(),
    leagueId: getEspnLeagueId(),
    hasS2: !!process.env.ESPN_S2,
    hasSWID: !!process.env.ESPN_SWID,
  });
}
