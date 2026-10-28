// src/lib/espn.ts
const ESPN_READS = 'https://lm-api-reads.fantasy.espn.com';
const ESPN_MAIN  = 'https://fantasy.espn.com';

export type LeagueKey = 'A' | 'B' | 'C';

export function buildEspnUrl(
  season: number | string,
  leagueId: number | string,
  views: string[],
  useReads = true
) {
  const host = useReads ? ESPN_READS : ESPN_MAIN;
  const base = `${host}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`;
  const params = views.map(v => `view=${encodeURIComponent(v)}`).join('&');
  return `${base}?${params}`;
}

/** Pick the correct cookie set per league (A/B/C) */
export function espnHeadersForLeague(opts: { leagueId?: string; key?: LeagueKey }) {
  const { leagueId, key } = opts;

  const ids = {
    A: process.env.ESPN_LEAGUE_ID_A,
    B: process.env.ESPN_LEAGUE_ID_B,
    C: process.env.ESPN_LEAGUE_ID_C,
  };

  const picks2 = {
    A: process.env.ESPN_S2_A,
    B: process.env.ESPN_S2_B,
    C: process.env.ESPN_S2_C,
  };

  const pickSwid = {
    A: process.env.ESPN_SWID_A,
    B: process.env.ESPN_SWID_B,
    C: process.env.ESPN_SWID_C,
  };

  // Decide which league key to use
  let resolved: LeagueKey | null = null;
  if (key && ids[key] && (!leagueId || leagueId === ids[key])) {
    resolved = key;
  } else {
    (['A','B','C'] as LeagueKey[]).forEach(k => {
      if (!resolved && leagueId && ids[k] && leagueId === ids[k]) resolved = k;
    });
  }

  if (!resolved) throw new Error(`Unable to resolve league key for ${leagueId ?? key}`);

  const s2 = picks2[resolved] || '';
  const swid = pickSwid[resolved] || '';

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Referer: 'https://fantasy.espn.com/',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
  };
  if (s2 && swid) headers['Cookie'] = `espn_s2=${s2}; SWID=${swid};`;
  return headers;
}

/* Helpers used by summary route and elsewhere */
export function toTeamName(t: any) {
  const loc = (t?.location || '').trim();
  const nick = (t?.nickname || '').trim();
  const name = (t?.name || '').trim();
  const composed = `${loc} ${nick}`.trim();
  return (composed || name || `Team ${t?.id ?? ''}`).trim();
}

export function toRecordRow(t: any, rank: number) {
  const r = t?.record?.overall || t?.record?.[0] || {};
  return {
    rank,
    teamId: t?.id,
    name: toTeamName(t),
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    ties: r.ties ?? 0,
    pointsFor: +(r.pointsFor ?? r.points_for ?? 0),
    pointsAgainst: +(r.pointsAgainst ?? r.points_against ?? 0),
  };
}
