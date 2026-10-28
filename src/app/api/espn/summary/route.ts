// app/api/espn/summary/route.ts
import { buildEspnUrl, espnHeadersForLeague, toRecordRow, toTeamName } from '../../../../../lib/espn';
import { fetchJson } from '../../../../../lib/http';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { parseLeagueKey, parseNumericId, parseSeason } from '../../../../../lib/validation';

type LeagueKey = 'A' | 'B' | 'C';

const FALLBACK_LEAGUES: Record<LeagueKey, string> = {
  A: '23105994',
  B: '1685952483',
  C: '723900321',
};

function leagueIdFromKey(key: LeagueKey): string | undefined {
  return (
    (key === 'A' && process.env.ESPN_LEAGUE_ID_A) ||
    (key === 'B' && process.env.ESPN_LEAGUE_ID_B) ||
    (key === 'C' && process.env.ESPN_LEAGUE_ID_C) ||
    FALLBACK_LEAGUES[key]
  );
}

function resolveLeagueId(
  leagueIdParam?: string | null,
  keyParam?: LeagueKey | null
): { id: string; key?: LeagueKey } {
  // numeric leagueId wins
  if (leagueIdParam && /^\d+$/.test(leagueIdParam)) return { id: leagueIdParam };

  // if leagueId is A/B/C, treat as key
  const possibleKey: LeagueKey | undefined =
    (leagueIdParam && /^[ABC]$/i.test(leagueIdParam)
      ? (leagueIdParam.toUpperCase() as LeagueKey)
      : undefined) || keyParam || undefined;

  if (possibleKey) {
    const id = leagueIdFromKey(possibleKey);
    if (!id) throw new Error(`Unable to resolve league id for key ${possibleKey}`);
    return { id, key: possibleKey };
  }

  throw new Error(
    `Missing or invalid league reference. Provide ?key=A|B|C or ?leagueId=<number>.`
  );
}

async function fetchEspnJson(season: string, leagueId: string, headers: HeadersInit) {
  // match your other code’s pattern: try reads host first, then main
  const views = ['mSettings', 'mTeam', 'mStandings', 'mRoster', 'mNav']; // generous
  const tries = [
    buildEspnUrl(season, leagueId, views, true),
    buildEspnUrl(season, leagueId, views, false),
  ];

  for (const url of tries) {
    try {
      return await fetchJson<any>(url, { headers, timeoutMs: 12000 });
    } catch {
      // Try the next host.
    }
  }
  const err = new Error('ESPN fetch failed');
  throw err;
}

function buildOwnersMap(data: any): Record<string, string> {
  const map: Record<string, string> = {};

  // members array (older APIs)
  const members = Array.isArray(data?.members) ? data.members : [];
  for (const m of members) {
    const id = m?.id ?? m?.memberId ?? m?.userId;
    const name =
      m?.displayName ||
      [m?.firstName, m?.lastName].filter(Boolean).join(' ') ||
      m?.nickname ||
      '';
    if (id != null && name) map[String(id)] = String(name);
  }

  // users array (newer payloads sometimes)
  const users = Array.isArray(data?.users) ? data.users : [];
  for (const u of users) {
    const id = u?.id ?? u?.userId;
    const name =
      u?.displayName ||
      [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
      u?.nickname ||
      '';
    if (id != null && name) map[String(id)] = String(name);
  }

  // team owners sometimes only appear on teams; backfill with “Owner {id}”
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  for (const t of teams) {
    const primary = t?.primaryOwner || (Array.isArray(t?.owners) ? t.owners[0] : undefined);
    if (primary != null && !map[String(primary)]) {
      map[String(primary)] = `Owner ${String(primary)}`;
    }
  }

  return map;
}

function normalizeTeams(data: any) {
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  return teams.map((t: any, idx: number) => {
    // optional helper from your lib; fall back to safe fields
    let name = '';
    try {
      name = toTeamName ? toTeamName(t) : (t?.location && t?.nickname ? `${t.location} ${t.nickname}` : t?.name || `Team ${t?.id ?? idx+1}`);
    } catch {
      name = t?.name || `Team ${t?.id ?? idx+1}`;
    }

    // record/standings (use toRecordRow if available)
    let pf = Number(t?.record?.overall?.pointsFor ?? t?.points?.for ?? 0);
    let pa = Number(t?.record?.overall?.pointsAgainst ?? t?.points?.against ?? 0);
    let rank = Number(t?.playoffSeed ?? t?.rank ?? t?.overallStanding ?? 0);

    try {
      if (toRecordRow) {
        const r = toRecordRow(t, idx + 1);
        pf = Number(r?.pointsFor ?? pf);
        pa = Number(r?.pointsAgainst ?? pa);
        rank = Number(r?.rank ?? rank);
      }
    } catch {
      // ignore
    }

    return {
      id: t?.id ?? idx + 1,
      name,
      abbrev: t?.abbrev || t?.teamAbbrev,
      primaryOwner: t?.primaryOwner,
      owners: Array.isArray(t?.owners) ? t.owners : undefined,
      record: t?.record,
      pointsFor: pf,
      pointsAgainst: pa,
      playoffSeed: t?.playoffSeed ?? undefined,
      rank: rank || undefined,
      logo: t?.logo || t?.logoUrl || undefined,
    };
  });
}

export async function GET(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'espn-summary', 120, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(req.url);
    const season = parseSeason(
      searchParams.get('season'),
      process.env.ESPN_SEASON || String(new Date().getFullYear()),
    );

    const keyParam = parseLeagueKey(searchParams.get('key'));
    const leagueIdRaw = searchParams.get('leagueId');
    const normalizedLeagueId =
      leagueIdRaw && /^\d+$/.test(leagueIdRaw)
        ? parseNumericId(leagueIdRaw, 'leagueId', { minLength: 4, maxLength: 20 })
        : leagueIdRaw;

    const { id: leagueId } = resolveLeagueId(normalizedLeagueId, keyParam || null);

    const headers = espnHeadersForLeague({ leagueId, key: keyParam || undefined });
    const data = await fetchEspnJson(season, leagueId, headers);

    const leagueName =
      data?.settings?.name || data?.metadata?.leagueName || `League ${leagueId}`;

    const teams = normalizeTeams(data);

    // best-effort users/owners
    const ownersMap = buildOwnersMap(data);
    const users =
      (Array.isArray(data?.users) ? data.users : []).map((u: any) => ({
        id: u?.id ?? u?.userId,
        userId: u?.userId ?? u?.id,
        firstName: u?.firstName,
        lastName: u?.lastName,
        displayName:
          u?.displayName ||
          [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
          u?.nickname,
        nickname: u?.nickname,
        teamId: u?.teamId,
      })) ||
      undefined;

    const owners =
      (Array.isArray(data?.members) ? data.members : []).map((m: any) => ({
        id: String(m?.id ?? m?.userId ?? m?.memberId ?? ''),
        displayName:
          m?.displayName ||
          [m?.firstName, m?.lastName].filter(Boolean).join(' ') ||
          m?.nickname,
      })) || undefined;

    const body = {
      leagueId: String(leagueId),
      leagueName,
      season,
      teams,
      users,
      ownersMap,
      owners,
    };

    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    const detail = err?.details;
    return new Response(JSON.stringify({ error: msg, details: detail }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
}
