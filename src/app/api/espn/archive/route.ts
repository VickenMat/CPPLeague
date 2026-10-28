// app/api/espn/archive/route.ts
import { fetchSeasonSchedule, NormalizedGame } from '../../../../../lib/espnHistoric';
type LeagueKey = 'A' | 'B' | 'C';

const asNum = (n: any) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

function resolveTeamName(g: any, side: 'home' | 'away') {
  const id = g?.[`${side}TeamId`];

  const normalized = g?.[`${side}Name`];
  if (typeof normalized === 'string' && normalized.trim().length) return normalized.trim();

  const loc = g?.[`${side}Location`];
  const nick = g?.[`${side}Nickname`];
  const joined = [loc, nick].filter((x) => typeof x === 'string' && x.trim().length).join(' ').trim();
  if (joined) return joined;

  const abbr = g?.[`${side}Abbrev`] ?? g?.[`${side}Abbreviation`];
  if (typeof abbr === 'string' && abbr.trim().length) return abbr.trim();

  return id ? `Team ${id}` : 'Unknown';
}

function isPlayoffsFlag(g: any): boolean {
  if (typeof g?.isPlayoffs === 'boolean') return g.isPlayoffs;
  const w = Number(g?.week ?? g?.matchupPeriodId ?? g?.scoringPeriodId);
  if (!Number.isFinite(w)) return false;
  return w >= 15 && w <= 17;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = (searchParams.get('key') || 'A').toUpperCase() as LeagueKey;
    const key: LeagueKey = keyParam === 'A' || keyParam === 'B' || keyParam === 'C' ? keyParam : 'A';

    const toDefault = Number(process.env.ESPN_SEASON || new Date().getFullYear());
    const from = Number(searchParams.get('from') || 2018);
    const to = Number(searchParams.get('to') || toDefault);
    const limit = Number(searchParams.get('limit') || 5);
    const debug = searchParams.get('debug') === '1';

    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      return new Response(JSON.stringify({ error: 'Invalid from/to' }), { status: 400 });
    }

    const seasonBundles: Array<{ season: number; schedule: NormalizedGame[] }> = [];
    const notes: string[] = [];
    for (let y = from; y <= to; y++) {
      try {
        const sb = await fetchSeasonSchedule(key, y);
        seasonBundles.push({ season: y, schedule: Array.isArray(sb?.schedule) ? sb.schedule : [] });
        if (!sb?.schedule?.length) notes.push(`Season ${y}: empty schedule`);
      } catch (e: any) {
        notes.push(`Season ${y}: ${e?.message || String(e)}`);
        seasonBundles.push({ season: y, schedule: [] });
      }
    }

    const all: any[] = seasonBundles.flatMap((b) => b.schedule || []);
    const finished = all.filter((g) => asNum(g.homePoints) > 0 || asNum(g.awayPoints) > 0);

    const reg = finished.filter((g) => !isPlayoffsFlag(g));
    const po = finished.filter((g) => isPlayoffsFlag(g));

    const mapGame = (g: any) => {
      const homePoints = asNum(g.homePoints);
      const awayPoints = asNum(g.awayPoints);
      return {
        season: asNum(g.season),
        week: asNum(g.week ?? g.matchupPeriodId ?? g.scoringPeriodId),
        homeTeam: resolveTeamName(g, 'home'),
        awayTeam: resolveTeamName(g, 'away'),
        homePoints,
        awayPoints,
        margin: Math.abs(homePoints - awayPoints),
      };
    };

    const byMarginDesc = (a: any, b: any) => b.margin - a.margin;
    const byMarginAsc = (a: any, b: any) => a.margin - b.margin;
    const byPFDesc = (a: any, b: any) => b.points - a.points;

    const blowouts = {
      regular: reg.map(mapGame).sort(byMarginDesc).slice(0, limit),
      playoffs: po.map(mapGame).sort(byMarginDesc).slice(0, limit),
    };

    const closest = {
      regular: reg.map(mapGame).filter((r) => r.margin > 0).sort(byMarginAsc).slice(0, limit),
      playoffs: po.map(mapGame).filter((r) => r.margin > 0).sort(byMarginAsc).slice(0, limit),
    };

    const singlePF = {
      regular: reg
        .map((g: any) => {
          const home = asNum(g.homePoints);
          const away = asNum(g.awayPoints);
          const homeWins = home >= away;
          return {
            season: asNum(g.season),
            week: asNum(g.week ?? g.matchupPeriodId ?? g.scoringPeriodId),
            team: resolveTeamName(g, homeWins ? 'home' : 'away'),
            points: Math.max(home, away),
            oppTeam: resolveTeamName(g, homeWins ? 'away' : 'home'),
          };
        })
        .sort(byPFDesc)
        .slice(0, limit),
      playoffs: po
        .map((g: any) => {
          const home = asNum(g.homePoints);
          const away = asNum(g.awayPoints);
          const homeWins = home >= away;
          return {
            season: asNum(g.season),
            week: asNum(g.week ?? g.matchupPeriodId ?? g.scoringPeriodId),
            team: resolveTeamName(g, homeWins ? 'home' : 'away'),
            points: Math.max(home, away),
            oppTeam: resolveTeamName(g, homeWins ? 'away' : 'home'),
          };
        })
        .sort(byPFDesc)
        .slice(0, limit),
    };

    const seasonsFetched = seasonBundles.filter((b) => b.schedule.length > 0).length;

    const teamDirBySeason: Record<string, Array<{ id: number; name: string }>> = {};
    for (const b of seasonBundles) {
      const map = new Map<number, string>();
      for (const g of b.schedule) {
        if (g.homeTeamId > 0) map.set(g.homeTeamId, g.homeName);
        if (g.awayTeamId > 0) map.set(g.awayTeamId, g.awayName);
      }
      teamDirBySeason[b.season] = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }

    const body: any = {
      league: key,
      range: { from, to },
      counts: {
        seasonsFetched,
        games: finished.length,
        gamesWithScores: finished.length,
      },
      blowouts,
      closest,
      singlePF,
    };

    if (debug) {
      body.teams = teamDirBySeason;
      body.notes = notes;
    }

    return new Response(JSON.stringify(body, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'archive route failed', message: err?.message || String(err) }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
