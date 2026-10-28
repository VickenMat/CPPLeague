import { NextResponse } from 'next/server';
import { getAvailablePlayers } from '../../../../../lib/available-players';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { parseLeagueKey, parseSeason } from '../../../../../lib/validation';

export async function GET(req: Request) {
  const limited = checkRateLimit(req, 'espn-available-players', 30, 60_000);
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  const key = parseLeagueKey(params.get('key'));
  if (!key) return NextResponse.json({ error: 'Select league A, B, or C.' }, { status: 400 });
  let season: string;
  try {
    season = parseSeason(params.get('season'), process.env.ESPN_SEASON || String(new Date().getFullYear()));
  } catch {
    return NextResponse.json({ error: 'Invalid season.' }, { status: 400 });
  }
  const leagueId = process.env[`ESPN_LEAGUE_ID_${key}`];
  if (!leagueId) return NextResponse.json({ error: 'This league is not configured.' }, { status: 503 });
  try {
    const result = await getAvailablePlayers(leagueId, season);
    return NextResponse.json({ ...result, season, league: key, updatedAt: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to load the ESPN player pool. Please retry. If this continues, check the league credentials and season configuration.' }, { status: 502 });
  }
}
