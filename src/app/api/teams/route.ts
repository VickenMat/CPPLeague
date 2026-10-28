import { NextResponse } from "next/server";
import { getLeagueSummary } from "../../../../lib/getLeagueSummary";
export async function GET() {
  try {
    const league = await getLeagueSummary();
    return NextResponse.json(
      league.teams.map((team) => ({
        id: String(team.id),
        name: team.name,
        leagueId: league.leagueId,
        season: league.season,
        active: true,
      })),
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load teams from ESPN." },
      { status: 502 },
    );
  }
}
