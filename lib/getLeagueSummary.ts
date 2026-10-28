// src/lib/getLeagueSummary.ts
import { buildEspnUrl, espnHeadersForLeague, toRecordRow, toTeamName } from './espn';

type LeagueKey = 'A' | 'B' | 'C';

export async function getLeagueSummary(opts: {
  season: string | number;
  leagueId?: string;
  key?: LeagueKey;
  debug?: boolean;
}) {
  const { season, leagueId: leagueIdParam, key, debug } = opts;

  if (!season || (!leagueIdParam && !key)) {
    throw new Error('Missing season and leagueId or key');
  }

  const leagueId =
    leagueIdParam ||
    (key === 'A'
      ? process.env.ESPN_LEAGUE_ID_A
      : key === 'B'
      ? process.env.ESPN_LEAGUE_ID_B
      : key === 'C'
      ? process.env.ESPN_LEAGUE_ID_C
      : undefined);

  if (!leagueId) throw new Error('Unable to resolve leagueId');

  const headers = espnHeadersForLeague({ leagueId, key });

  const views = ['mSettings', 'mTeam', 'mStandings'];
  const tries = [
    { url: buildEspnUrl(season, leagueId, views, true), host: 'reads' },
    { url: buildEspnUrl(season, leagueId, views, false), host: 'main' },
  ];

  let okJson: any = null;
  let lastError: any = null;

  for (const t of tries) {
    const res = await fetch(t.url, { headers, cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!res.ok || !ct.includes('application/json')) {
      lastError = {
        host: t.host,
        espnStatus: res.status,
        contentType: ct,
        url: t.url,
        bodyPreview: debug ? text.slice(0, 800) : undefined,
      };
      continue;
    }
    try {
      okJson = JSON.parse(text);
      break;
    } catch (e) {
      lastError = { host: t.host, espnStatus: res.status, contentType: ct, parseError: String(e) };
    }
  }

  if (!okJson) {
    const hint =
      (lastError?.espnStatus === 401 || lastError?.espnStatus === 403)
        ? 'Unauthorized/Forbidden: refresh ESPN_S2_*/ESPN_SWID_* for this league.'
        : lastError?.espnStatus === 404
        ? 'Not found: check the leagueId OR the correct season year.'
        : 'ESPN returned HTML instead of JSON. Try the previous season (e.g., 2024) or refresh cookies.';
    const err = new Error('ESPN fetch failed');
    (err as any).details = { season, leagueId, usedKey: key ?? null, lastError, hint };
    throw err;
  }

  const data: any = okJson;
  const leagueName = data?.settings?.name || data?.metadata?.leagueName || `League ${leagueId}`;
  const currentWeek = data?.scoringPeriodId ?? data?.status?.currentMatchupPeriod ?? null;
  const draftDate = data?.draftSettings?.date ?? null;

  const members = Array.isArray(data?.members) ? data.members : [];
  const ownersMap: Record<string, string> = {};
  for (const m of members) {
    const id = String(m?.id ?? '');
    if (!id) continue;
    const dn =
      m?.displayName ||
      [m?.firstName, m?.lastName].filter(Boolean).join(' ') ||
      m?.nickname ||
      '';
    ownersMap[id] = dn;
  }

  const rawTeams = Array.isArray(data?.teams) ? data.teams : [];
  const sortedTeams = [...rawTeams].sort((a: any, b: any) => {
    const ar = a?.record?.overall || {};
    const br = b?.record?.overall || {};
    if ((br.wins ?? 0) !== (ar.wins ?? 0)) return (br.wins ?? 0) - (ar.wins ?? 0);
    const apf = ar.pointsFor ?? 0,
      bpf = br.pointsFor ?? 0;
    if (bpf !== apf) return bpf - apf;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  const standings = sortedTeams.map((t: any, i: number) => toRecordRow(t, i + 1));

  return {
    leagueId,
    season,
    leagueName,
    currentWeek,
    draftDate,
    teamCount: rawTeams.length,
    teams: rawTeams.map((t: any) => ({
      id: t.id,
      name: toTeamName(t),
      abbrev: t?.abbrev ?? '',
      owners: t?.owners ?? [],
      primaryOwner: (t?.owners && t.owners[0]) || t?.primaryOwner || '',
      record: t?.record,
      pointsFor: +(t?.record?.overall?.pointsFor ?? t?.pointsFor ?? 0),
      pointsAgainst: +(t?.record?.overall?.pointsAgainst ?? t?.pointsAgainst ?? 0),
      logo: t?.logo ?? t?.logoUrl ?? '',
      // NEW: carry through final/playoff info so TeamPage can use it
      finalRank: t?.finalRank ?? t?.rankFinal ?? null,
      playoffSeed: t?.playoffSeed ?? null,
      finalStanding: t?.finalStanding ?? null,
    })),
    standings,
    ownersMap,
    users: members,
  };
}
