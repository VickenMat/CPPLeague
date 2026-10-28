import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

const POINTS: Record<string, number> = {
  'Goat': 5,
  'Valid': 4,
  'Mid': 3,
  'Washed': 2,
  'Maybe Next Year': 1,
};

const RANK_NUM: Record<string, number> = {
  'Goat': 1,
  'Valid': 2,
  'Mid': 3,
  'Washed': 4,
  'Maybe Next Year': 5,
};

type LeagueKey = 'A' | 'B';
type BallotJoin = { user_id: string | null; updated_at: string | null };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueFilter = searchParams.get('league')?.toUpperCase() as LeagueKey | undefined;

  // Get all active teams (with league)
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, league')
    .eq('active', true);
  if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });

  const byId = new Map(teams.map(t => [t.id, t]));
  const leagues: LeagueKey[] = leagueFilter ? [leagueFilter] : ['A', 'B'];

  // Fetch ballot items joined to ballots for user_id and timestamp
  const { data: items, error: itemsErr } = await supabase
    .from('ballot_items')
    .select('ballot_id, team_id, tier, created_at, ballots!inner(user_id, updated_at), teams:team_id(id, name, league)')
    .order('created_at', { ascending: false });

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Build per-league aggregates
  const results = leagues.map((L) => {
    // init totals for teams in league
    const totals = new Map<string, { teamName: string; points: number; rankSum: number; rankCount: number }>();
    for (const t of teams) if (t.league === L) totals.set(t.id, { teamName: t.name, points: 0, rankSum: 0, rankCount: 0 });

    const ballotUsers = new Set<string>();
    let latestTs: string | null = null;

    for (const row of items ?? []) {
      const ballot = (Array.isArray(row.ballots) ? row.ballots[0] : row.ballots) as BallotJoin | null | undefined;
      const t = byId.get(row.team_id);
      if (!t || t.league !== L || !ballot?.user_id) continue;

      const p = POINTS[row.tier] ?? 0;
      const r = RANK_NUM[row.tier] ?? null;

      const agg = totals.get(row.team_id);
      if (!agg) continue;

      agg.points += p;
      if (r != null) {
        agg.rankSum += r;
        agg.rankCount += 1;
      }

      ballotUsers.add(ballot.user_id);
      const ts = ballot.updated_at ?? row.created_at;
      if (!latestTs || ts > latestTs) latestTs = ts;
    }

    const rankings = Array.from(totals.values())
      .map(v => ({
        teamName: v.teamName,
        points: v.points,
        avgRank: v.rankCount ? v.rankSum / v.rankCount : null,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (a.avgRank == null && b.avgRank != null) return 1;
        if (a.avgRank != null && b.avgRank == null) return -1;
        if (a.avgRank != null && b.avgRank != null) return a.avgRank - b.avgRank;
        return a.teamName.localeCompare(b.teamName);
      });

    return {
      league: L,
      updatedAt: latestTs ?? new Date(0).toISOString(),
      ballots: ballotUsers.size,
      rankings,
    };
  });

  if (leagueFilter) return NextResponse.json(results[0]);
  return NextResponse.json(results);
}
