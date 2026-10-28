// src/lib/espnHistoric.ts
import { espnHeadersForLeague, buildEspnUrl, LeagueKey } from '../lib/espn';

export type { LeagueKey };

export type NormalizedGame = {
  season: number;
  week: number;
  homeTeamId: number;
  awayTeamId: number;
  homeName: string;
  awayName: string;
  homePoints: number;
  awayPoints: number;
  margin: number;
  winnerTeamId: number | null;
  isPlayoffs: boolean;
};

export type SeasonBundle = {
  season: number;
  leagueId: string;
  schedule: NormalizedGame[];
  raw?: any;
};

const WEEK_PHASE_DEFAULT = { poStart: 15, poEnd: 17 };

const WEEK_PHASE_OVERRIDES: Record<LeagueKey, Record<number, { poStart: number; poEnd: number }>> = {
  A: {},
  B: {},
  C: {},
};

function getWeekPhase(key: LeagueKey, season: number) {
  return WEEK_PHASE_OVERRIDES[key]?.[season] ?? WEEK_PHASE_DEFAULT;
}

const NAME_OVERRIDES_BY_ID: Record<number, string> = {
  2: 'Aleena Surenian/Alina Dekirmenjian',
  9: 'Alec Peltekian',
};

const NAME_OVERRIDES_BY_ABBREV: Record<string, string> = {
  SEEN: 'Sena Changelian',
  HOVS: 'Njteh Hovsepian',
  VAH: 'Vahey Mouradian',
  JST: 'Jacob Naroian',
  KDK: 'Kevork DerKevorkian',
  HHT: 'Hampton Trout',
  CTE: 'Alec Soghomonian',
  NNT: 'Njteh Hovsepian',
  VIC: 'Vicken Matiossian',
  KESH: 'Shant Keshishian',
  MATI: 'Vicken Matiossian',
  BKN: 'Aren Dakessian',
  VST: 'Vasken Kebabjian',
  VST2: 'Vadik Bagdasarian',
  SST: 'Shant Poladian',
  HRB: 'Armen Surenian',
  BAO: 'Aren Banklian',
  DBVC: 'Violette Dekirmenjian',
  GHS: 'Garen Soukiasian',
  ANDY: 'Andrew Sisitzky',
  COCK: 'Raphael Yeremian',
  ABOY: 'Nareg Aboyan',
  ARA: 'Ara Changelian',
  MAS: 'Masis Mardirosian',
  ASS: 'Sam Sagherian',
  AAC: 'Ara Changelian',
  NYG: 'Sam Sagherian',
  JUUL: 'Shant Alashaian',
  YUM: 'Gregory Cormier',
  VTA: 'Vadik Bagdasarian',
  BUM: 'Armen Surenian',
  POL: 'Shant Poladian',
  VVT: 'Vasken Kebabjian',
  NAH: 'Aren Banklian',
  W: 'Jacob Naroian',
  DERN: 'Sena Changeliam',
  RAPH: 'Raphael Yeremian',
  HEYO: 'Khachik Yetenekian',
  MINA: 'Carrie Minasian',
  GLIR: 'Garen Soukiasian',
  BKB: 'Aren Dakesssian',
  BEAN: 'Shant Alashaian',
};

function buildHistoryUrl(leagueId: string | number, season: number, views: string[]) {
  const base = `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}`;
  const params = new URLSearchParams({ seasonId: String(season) });
  for (const v of views) params.append('view', v);
  return `${base}?${params.toString()}`;
}

function getResolvedLeagueId(key: LeagueKey): string {
  const id =
    key === 'A'
      ? process.env.ESPN_LEAGUE_ID_A
      : key === 'B'
      ? process.env.ESPN_LEAGUE_ID_B
      : process.env.ESPN_LEAGUE_ID_C;

  if (!id) throw new Error(`Missing league id for ${key} (check ESPN_LEAGUE_ID_${key})`);
  return id;
}

function num(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function extractPoints(side: any): number {
  return num(
    side?.totalPoints ??
      side?.totalPointsLive ??
      side?.points ??
      side?.score ??
      side?.adjustedPoints ??
      0
  );
}

function teamName(t: any): string {
  const id = Number(t?.id);
  const abbrev = (t?.abbrev ?? '').toString().trim();

  if (Number.isFinite(id) && NAME_OVERRIDES_BY_ID[id]) return NAME_OVERRIDES_BY_ID[id];
  if (abbrev) {
    const o = NAME_OVERRIDES_BY_ABBREV[abbrev.toUpperCase()];
    if (o) return o;
  }

  const loc = (t?.location ?? '').toString().trim();
  const nick = (t?.nickname ?? '').toString().trim();
  const combined = `${loc} ${nick}`.trim();
  if (combined) return combined;

  if (abbrev) return abbrev;
  return `Team ${Number.isFinite(id) ? id : ''}`.trim();
}

type EspnTeam = {
  id: number;
  playoffSeed?: number;
  record?: {
    overall?: { wins: number; losses: number; ties: number };
    pointsFor?: number;
  };
  overallStanding?: number;
};

function computeSeedMap(teams: EspnTeam[]): Record<number, number> {
  const result: Record<number, number> = {};

  const haveAllSeeds =
    teams.length > 0 &&
    teams.every(t => typeof t.playoffSeed === 'number' && Number.isFinite(t.playoffSeed));

  if (haveAllSeeds) {
    for (const t of teams) result[t.id] = Number(t.playoffSeed);
    return result;
  }

  const ranked = [...teams].sort((a, b) => {
    const aw = a.record?.overall?.wins ?? 0;
    const bw = b.record?.overall?.wins ?? 0;
    if (bw !== aw) return bw - aw;

    const at = a.record?.overall?.ties ?? 0;
    const bt = b.record?.overall?.ties ?? 0;
    if (bt !== at) return bt - at;

    const apf = a.record?.pointsFor ?? 0;
    const bpf = b.record?.pointsFor ?? 0;
    return bpf - apf;
  });

  ranked.forEach((t, i) => {
    result[t.id] = i + 1;
  });

  return result;
}

export async function fetchSeasonSchedule(key: LeagueKey, season: number): Promise<SeasonBundle> {
  const leagueId = getResolvedLeagueId(key);

  const views = ['mMatchup', 'mMatchupScore', 'mTeam'];
  const headers = espnHeadersForLeague({ key });
  let data: any;

  if (season <= 2017) {
    const url = buildHistoryUrl(leagueId, season, views);
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`ESPN history fetch failed ${season}: ${res.status}`);
    const arr = await res.json();
    data = Array.isArray(arr) ? arr[0] : arr;
  } else {
    const url = buildEspnUrl(season, leagueId, views);
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`ESPN season fetch failed ${season}: ${res.status}`);
    data = await res.json();
  }

  const teamById = new Map<number, string>();
  const teamsArr = Array.isArray(data?.teams) ? data.teams : [];

  if (process.env.DEBUG_ESPN_TEAMS) {
    const rows = teamsArr.map((t: any) => ({
      season,
      id: Number(t?.id),
      abbrev: String(t?.abbrev ?? '').trim(),
      espnName: `${String(t?.location ?? '').trim()} ${String(t?.nickname ?? '').trim()}`.trim(),
      resolved: teamName(t),
    }));
    console.log('=== TEAM ID MAP ===');
    console.table(rows);
  }

  for (const t of teamsArr) {
    if (t?.id != null) teamById.set(Number(t.id), teamName(t));
  }

  const seedByTeamId = computeSeedMap(teamsArr as EspnTeam[]);
  const scheduleRaw = Array.isArray(data?.schedule) ? data.schedule : [];

  const schedule: NormalizedGame[] = scheduleRaw
    .map((g: any) => {
      const week = num(g?.matchupPeriodId);
      const h = g?.home ?? {};
      const a = g?.away ?? {};

      const homeId = num(h?.teamId);
      const awayId = num(a?.teamId);

      const homePoints = extractPoints(h);
      const awayPoints = extractPoints(a);

      const winnerTeamId =
        g?.winner === 'HOME'
          ? homeId
          : g?.winner === 'AWAY'
          ? awayId
          : homePoints > awayPoints
          ? homeId
          : homePoints < awayPoints
          ? awayId
          : null;

      const { poStart, poEnd } = getWeekPhase(key, season);
      const inPoWindow = Number.isFinite(week) && week >= poStart && week <= poEnd;

      const homeSeed = seedByTeamId[homeId];
      const awaySeed = seedByTeamId[awayId];

      const bothTop7 =
        Number.isFinite(homeSeed) && Number.isFinite(awaySeed) &&
        homeSeed >= 1 && homeSeed <= 7 &&
        awaySeed >= 1 && awaySeed <= 7;

      const isPlayoffs = Boolean(inPoWindow && bothTop7);

      return {
        season,
        week: Number.isFinite(week) && week > 0 ? week : -1,
        homeTeamId: homeId > 0 ? homeId : -1,
        awayTeamId: awayId > 0 ? awayId : -1,
        homeName: teamById.get(homeId) ?? 'Home',
        awayName: teamById.get(awayId) ?? 'Away',
        homePoints,
        awayPoints,
        margin: Math.abs(homePoints - awayPoints),
        winnerTeamId,
        isPlayoffs,
      };
    })
    .filter((x: NormalizedGame) => x.week > 0 && x.homeTeamId > 0 && x.awayTeamId > 0);

  return { season, leagueId: String(leagueId), schedule, raw: undefined };
}

export async function fetchSeasonDraftAndRosters(key: LeagueKey, season: number) {
  const leagueId = getResolvedLeagueId(key);
  const headers = espnHeadersForLeague({ key });
  const url = buildEspnUrl(season, leagueId, ['mDraftDetail', 'mRoster']);
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN draft/roster fetch failed ${season}: ${res.status}`);
  const data = await res.json();
  return data;
}
