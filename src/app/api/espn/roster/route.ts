// // app/api/espn/roster/route.ts
// import { NextResponse } from 'next/server';
// import { espnHeadersForLeague, buildEspnUrl } from '../../../../../lib/espn';

// const POS: Record<number, string> = {
//   1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST',
// };

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const leagueId = searchParams.get('leagueId');
//   const season = searchParams.get('season') ?? process.env.ESPN_SEASON;
//   const teamId = searchParams.get('teamId');

//   if (!leagueId || !season || !teamId) {
//     return NextResponse.json({ error: 'Missing leagueId, season, or teamId' }, { status: 400 });
//   }

//   try {
//     const url = buildEspnUrl(season, leagueId, ['mRoster', 'mTeam']);
//     const res = await fetch(url, { headers: espnHeadersForLeague({ leagueId }), cache: 'no-store' });
//     if (!res.ok) return NextResponse.json({ error: 'Failed to fetch league/roster' }, { status: res.status });
//     const json = await res.json();

//     const team = (json?.teams ?? []).find((t: any) => String(t.id) === String(teamId));
//     if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

//     const entries = team?.roster?.entries ?? [];
//     const players = entries.map((e: any) => {
//       const p = e?.playerPoolEntry?.player ?? e?.player ?? {};
//       const id = p.id ?? e?.playerId;
//       const fullName = p.fullName ?? p.name ?? 'Unknown';
//       const pos = POS[p?.defaultPositionId] ?? 'Other';
//       const proTeamAbbrev = p?.proTeamAbbrev ?? p?.proTeam?.abbrev ?? '';
//       return { id, name: fullName, position: pos, nflTeam: proTeamAbbrev };
//     });

//     return NextResponse.json({
//       team: {
//         id: team.id,
//         name: team?.location && team?.nickname ? `${team.location} ${team.nickname}` : (team?.name ?? `Team ${team.id}`),
//         abbrev: team?.abbrev,
//       },
//       players,
//     });
//   } catch (e: any) {
//     return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
//   }
// }

// src/app/api/espn/roster/route.ts
import { NextResponse } from 'next/server';
import { espnHeadersForLeague, buildEspnUrl } from '../../../../../lib/espn';
import { fetchJson } from '../../../../../lib/http';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { parseNumericId, parseSeason } from '../../../../../lib/validation';

// default-position → fantasy position
const POS: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
};

// lineupSlotId → slot label (used for starters/bench/IR)
const SLOT: Record<number, string> = {
  0: 'QB',
  2: 'RB',
  3: 'RB/WR',
  4: 'WR',
  5: 'WR/TE',
  6: 'TE',
  7: 'OP',
  16: 'D/ST',
  17: 'K',
  20: 'BE',
  21: 'IR',
};

export async function GET(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'espn-roster', 90, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  try {
    const leagueId = parseNumericId(searchParams.get('leagueId'), 'leagueId', {
      minLength: 4,
      maxLength: 20,
    });
    const season = parseSeason(searchParams.get('season'), process.env.ESPN_SEASON);
    const teamId = parseNumericId(searchParams.get('teamId'), 'teamId', {
      minLength: 1,
      maxLength: 4,
    });

    const url = buildEspnUrl(season, leagueId, ['mRoster', 'mTeam']);
    const json = await fetchJson<any>(url, {
      headers: espnHeadersForLeague({ leagueId }),
      timeoutMs: 12000,
    });

    const team = (json?.teams ?? []).find(
      (t: any) => String(t.id) === String(teamId)
    );
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const entries = team?.roster?.entries ?? [];
    const players = entries.map((e: any) => {
      const p = e?.playerPoolEntry?.player ?? e?.player ?? {};
      const id = p.id ?? e?.playerId;
      const fullName = p.fullName ?? p.name ?? 'Unknown';
      const pos = POS[p?.defaultPositionId] ?? 'Other';
      const proTeamAbbrev = p?.proTeamAbbrev ?? p?.proTeam?.abbrev ?? '';
      const lineupSlotId = e?.lineupSlotId;
      const lineupSlot = SLOT[lineupSlotId] ?? undefined;
      const percentOwned =
        p?.ownership?.percentOwned ??
        p?.percentOwned ??
        undefined;

      return {
        id,
        name: fullName,
        position: pos,
        nflTeam: proTeamAbbrev,
        lineupSlot,
        percentOwned,
      };
    });

    return NextResponse.json({
      team: {
        id: team.id,
        name:
          (team?.location && team?.nickname
            ? `${team.location} ${team.nickname}`
            : team?.name) ?? `Team ${team.id}`,
        abbrev: team?.abbrev,
      },
      players,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unknown error' },
      { status: /Missing|Invalid/.test(e?.message || '') ? 400 : 500 }
    );
  }
}
