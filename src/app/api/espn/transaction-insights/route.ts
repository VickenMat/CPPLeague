import { NextResponse } from 'next/server';
import { getTransactionInsights } from '../../../../../lib/transaction-insights';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { parseLeagueKey, parseNumericId, parseSeason } from '../../../../../lib/validation';

export async function GET(req: Request) {
  const limited = checkRateLimit(req, 'espn-transaction-insights', 20, 60_000);
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  const key = parseLeagueKey(params.get('key'));
  if (!key) return NextResponse.json({ error: 'Select league A, B, or C.' }, { status: 400 });
  let season: string;
  let teamId: string;
  try {
    season = parseSeason(params.get('season'), process.env.ESPN_SEASON || String(new Date().getFullYear()));
    teamId = parseNumericId(params.get('teamId'), 'teamId', { minLength: 1, maxLength: 4 });
  } catch {
    return NextResponse.json({ error: 'Invalid season or team.' }, { status: 400 });
  }
  const leagueId = process.env[`ESPN_LEAGUE_ID_${key}`];
  if (!leagueId) return NextResponse.json({ error: 'This league is not configured.' }, { status: 503 });
  try {
    return NextResponse.json({ ...await getTransactionInsights(leagueId, season, Number(teamId)), season, league: key }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === 'Team not found' ? 'Team not found.' : 'Unable to load transaction insights from ESPN. Please retry.' },
      { status: error instanceof Error && error.message === 'Team not found' ? 404 : 502 });
  }
}
