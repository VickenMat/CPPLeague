// app/api/espn/ping/route.ts
export async function GET() {
  return new Response(JSON.stringify({
    season: process.env.ESPN_SEASON || '',
    A: {
      leagueId: process.env.ESPN_LEAGUE_ID_A || '',
      hasS2: !!process.env.ESPN_S2_A,
      hasSWID: !!process.env.ESPN_SWID_A,
    },
    B: {
      leagueId: process.env.ESPN_LEAGUE_ID_B || '',
      hasS2: !!process.env.ESPN_S2_B,
      hasSWID: !!process.env.ESPN_SWID_B,
    },
    C: {
      leagueId: process.env.ESPN_LEAGUE_ID_C || '',
      hasS2: !!process.env.ESPN_S2_C,
      hasSWID: !!process.env.ESPN_SWID_C,
    },
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
