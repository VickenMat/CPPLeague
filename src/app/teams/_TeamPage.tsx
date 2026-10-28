/* eslint-disable @next/next/no-img-element */
// src/app/teams/_TeamPage.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverBaseUrl } from '../../../lib/serverUrl';
import { personForTeam } from '../../../lib/teamPeople';
import { fetchJson } from '../../../lib/http';

type LeagueKey = 'A' | 'B' | 'C';
const LEAGUE_IDS: Record<LeagueKey, string> = {
  A: String(process.env.ESPN_LEAGUE_ID_A || '23105994'),
  B: String(process.env.ESPN_LEAGUE_ID_B || '1685952483'),
  C: String(process.env.ESPN_LEAGUE_ID_C || '723900321'),
};
const MIN_YEAR_BY_LEAGUE: Record<LeagueKey, number> = {
  A: 2019,
  B: 2024,
  C: 2024,
};

type SummaryTeam = {
  id: number | string;
  name: string;
  abbrev?: string;
  displayOwner?: string;
  primaryOwner?: string;
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
      pointsFor?: number;
      pointsAgainst?: number;
      streakLength?: number;
      streakType?: string;
      streakTypeId?: string;
    };
  };
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  finalRank?: number;
  playoffFinish?: number;
  finalStanding?: number;
  regularSeasonSeed?: number;
  playoffSeed?: number;
  rank?: number;
};

type SummaryPayload = {
  teams?: SummaryTeam[];
  standings?: any[];
};

type RosterPlayer = {
  id: string | number;
  name: string;
  position?: string;
  nflTeam?: string;
  lineupSlot?: string;
  percentOwned?: number;
  ownership?: { percentOwned?: number };
};

type RosterPayload = { players?: RosterPlayer[] };

const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// helper: playoff finish if we ever need it again
function extractPlayoffFinishRaw(tm: any): number | undefined {
  const candidates = [tm?.finalRank, tm?.playoffFinish, tm?.finalStanding, tm?.rankFinal];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

// position colors – text only
function getPosTextClasses(posRaw?: string): string {
  const pos = (posRaw || '').toUpperCase();
  switch (pos) {
    case 'QB':
      return 'text-red-400';
    case 'RB':
      return 'text-green-400';
    case 'WR':
      return 'text-blue-400';
    case 'TE':
      return 'text-orange-400';
    case 'D/ST':
    case 'DST':
      return 'text-purple-400';
    case 'K':
      return 'text-yellow-300';
    default:
      return 'text-gray-300';
  }
}

const isIRSlot = (slot?: string) => {
  if (!slot) return false;
  const s = slot.toUpperCase();
  return s === 'IR' || s.startsWith('IR');
};

const isBenchSlot = (slot?: string) => {
  if (!slot) return false;
  const s = slot.toUpperCase();
  return s === 'BE' || s === 'BENCH';
};

const isStarterSlot = (slot?: string) => !isBenchSlot(slot) && !isIRSlot(slot);

async function getSummaryByKey(key: LeagueKey, season: string): Promise<SummaryPayload> {
  const base = await serverBaseUrl();
  const url = `${base}/api/espn/summary?${new URLSearchParams({ key, season })}`;
  return fetchJson<SummaryPayload>(url);
}

async function getRoster(
  leagueId: string,
  teamId: string,
  season: string
): Promise<RosterPayload> {
  const base = await serverBaseUrl();
  const url = `${base}/api/espn/roster?${new URLSearchParams({ leagueId, teamId, season })}`;
  return fetchJson<RosterPayload>(url);
}

export default async function TeamPage({
  keyParam,
  teamId,
}: {
  keyParam: LeagueKey;
  teamId: string;
}) {
  const season = process.env.ESPN_SEASON || '';
  if (!season) throw new Error('Missing ESPN_SEASON');

  const leagueId = LEAGUE_IDS[keyParam];

  const summary = await getSummaryByKey(keyParam, season).catch(() => null);
  if (!summary) notFound();

  const teamsArr = Array.isArray(summary.teams) ? summary.teams : [];
  const team = teamsArr.find((t) => String(t.id) === String(teamId));
  if (!team) notFound();

  const standingsArr = (summary as any).standings || [];

  const owner =
    personForTeam({ teamId: team.id, teamName: team.name, league: keyParam, season }) ||
    (team as any).displayOwner ||
    team.primaryOwner ||
    'Unknown';

  // current-season stats
  const wins = num(team?.record?.overall?.wins ?? team?.wins, 0);
  const losses = num(team?.record?.overall?.losses ?? team?.losses, 0);
  const ties = num(team?.record?.overall?.ties ?? team?.ties, 0);
  const pf = num(team?.pointsFor, 0);
  const pa = num(team?.pointsAgainst, 0);
  const games = wins + losses + ties;
  const winPctSeason = games > 0 ? (wins + 0.5 * ties) / games : 0;

  // streak
  const streakLength = num((team as any).record?.overall?.streakLength, 0);
  const streakTypeRaw =
    ((team as any).record?.overall?.streakType as string | undefined) ||
    ((team as any).record?.overall?.streakTypeId as string | undefined);
  let streakDisplay = '—';
  if (streakLength > 0 && streakTypeRaw) {
    const c = streakTypeRaw[0].toUpperCase();
    const letter = c === 'W' ? 'W' : c === 'L' ? 'L' : 'T';
    streakDisplay = `${letter}${streakLength}`;
  }

  // playoff %
  const standingRow =
    standingsArr.find((r: any) => String(r.teamId ?? r.id) === String(teamId)) || null;

  const rawPlayoffPct =
    standingRow?.playoffPct ??
    standingRow?.playoffPercentage ??
    standingRow?.playoffOdds ??
    (team as any).record?.overall?.playoffPct ??
    (team as any).record?.overall?.playoffPercentage ??
    (team as any).record?.overall?.playoffOdds ??
    (team as any).playoffPct ??
    (team as any).playoffPercentage;

  let playoffPctDisplay = '—';
  if (typeof rawPlayoffPct === 'number') {
    const val = rawPlayoffPct > 1 ? rawPlayoffPct : rawPlayoffPct * 100;
    playoffPctDisplay = `${val.toFixed(1)}%`;
  }

  // current regular-season rank
  const sortedCurrent = [...teamsArr].sort((a, b) => {
    const ar = a?.record?.overall || {};
    const br = b?.record?.overall || {};
    if ((br.wins ?? 0) !== (ar.wins ?? 0)) return (br.wins ?? 0) - (ar.wins ?? 0);
    const apf = a.pointsFor ?? a?.record?.overall?.pointsFor ?? 0;
    const bpf = b.pointsFor ?? b?.record?.overall?.pointsFor ?? 0;
    if (bpf !== apf) return bpf - apf;
    return 0;
  });
  const curIdx = sortedCurrent.findIndex((t) => String(t.id) === String(teamId));
  const currentRank = curIdx >= 0 ? curIdx + 1 : undefined;

  // roster
  const rosterRes = await getRoster(leagueId, String(teamId), String(season)).catch(() => ({
    players: [],
  }));
  const players = Array.isArray(rosterRes?.players) ? rosterRes.players : [];

  // position counts
  const posCounts = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DST: 0,
    K: 0,
  };
  for (const p of players) {
    const pos = (p.position || '').toUpperCase();
    if (pos === 'QB') posCounts.QB++;
    else if (pos === 'RB') posCounts.RB++;
    else if (pos === 'WR') posCounts.WR++;
    else if (pos === 'TE') posCounts.TE++;
    else if (pos === 'D/ST' || pos === 'DST') posCounts.DST++;
    else if (pos === 'K') posCounts.K++;
  }

  const asSlot = (p: RosterPlayer) => (p.lineupSlot || p.position || '').toUpperCase();

  const starters = players.filter((p) => isStarterSlot(p.lineupSlot));
  const ir = players.filter((p) => isIRSlot(p.lineupSlot));

  const qb: RosterPlayer[] = [];
  const rb: RosterPlayer[] = [];
  const wr: RosterPlayer[] = [];
  const te: RosterPlayer[] = [];
  const dst: RosterPlayer[] = [];
  const k: RosterPlayer[] = [];
  const flexSlotPlayers: RosterPlayer[] = [];

  starters.forEach((p) => {
    const slot = asSlot(p);
    if (slot === 'QB') qb.push(p);
    else if (slot === 'RB') rb.push(p);
    else if (slot === 'WR') wr.push(p);
    else if (slot === 'TE') te.push(p);
    else if (slot === 'D/ST' || slot === 'DST') dst.push(p);
    else if (slot === 'K') k.push(p);
    else if (
      slot === 'RB/WR' ||
      slot === 'WR/RB' ||
      slot === 'WR/TE' ||
      slot === 'RB/WR/TE' ||
      slot === 'OP' ||
      slot === 'FLEX'
    ) {
      flexSlotPlayers.push(p);
    } else {
      flexSlotPlayers.push(p);
    }
  });

  const orderedStarters: RosterPlayer[] = [];
  const usedStarterIds = new Set<string | number>();

  const pushIf = (p?: RosterPlayer) => {
    if (!p) return;
    if (usedStarterIds.has(p.id)) return;
    orderedStarters.push(p);
    usedStarterIds.add(p.id);
  };

  // QB
  pushIf(qb[0]);
  // RB1, RB2
  pushIf(rb[0]);
  pushIf(rb[1]);
  // WR1, WR2, WR3
  pushIf(wr[0]);
  pushIf(wr[1]);
  pushIf(wr[2]);
  // TE1
  pushIf(te[0]);

  // FLEX: 3rd RB → 4th WR → 2nd TE → flex-slot
  let flexPlayer: RosterPlayer | undefined;
  if (rb.length >= 3) flexPlayer = rb[2];
  else if (wr.length >= 4) flexPlayer = wr[3];
  else if (te.length >= 2) flexPlayer = te[1];
  else if (flexSlotPlayers.length >= 1) flexPlayer = flexSlotPlayers[0];
  pushIf(flexPlayer);

  // D/ST, K
  pushIf(dst[0]);
  pushIf(k[0]);

  const bench = players.filter((p) => !isIRSlot(p.lineupSlot) && !usedStarterIds.has(p.id));

  // history
  const startYear = Number(season);
  const minYear = MIN_YEAR_BY_LEAGUE[keyParam];
  const seasons: string[] = [];
  for (let yr = startYear; yr >= minYear; yr--) seasons.push(String(yr));

  const history = await Promise.all(
    seasons.map(async (yr) => {
      const s = await getSummaryByKey(keyParam, yr).catch(() => null);
      if (!s) return { season: yr, found: false } as const;
      const allTeams = Array.isArray(s.teams) ? s.teams : [];
      const tm = allTeams.find((tt) => String(tt.id) === String(teamId));
      if (!tm) return { season: yr, found: false } as const;

      const sorted = [...allTeams].sort((a, b) => {
        const ar = a?.record?.overall || {};
        const br = b?.record?.overall || {};
        if ((br.wins ?? 0) !== (ar.wins ?? 0)) return (br.wins ?? 0) - (ar.wins ?? 0);
        const apf = a.pointsFor ?? a?.record?.overall?.pointsFor ?? 0;
        const bpf = b.pointsFor ?? b?.record?.overall?.pointsFor ?? 0;
        if (bpf !== apf) return bpf - apf;
        return 0;
      });
      const regIdx = sorted.findIndex((tt) => String(tt.id) === String(teamId));
      const regularSeasonFinish = regIdx >= 0 ? regIdx + 1 : undefined;

      const w = num(tm?.record?.overall?.wins ?? (tm as any).wins, 0);
      const l = num(tm?.record?.overall?.losses ?? (tm as any).losses, 0);
      const t = num(tm?.record?.overall?.ties ?? (tm as any).ties, 0);
      const g = w + l + t;
      const winPct = g > 0 ? (w + 0.5 * t) / g : 0;

      const playoffResult = extractPlayoffFinishRaw(tm);

      return {
        season: yr,
        found: true as const,
        name: tm.name,
        wins: w,
        losses: l,
        ties: t,
        winPct,
        pointsFor: num(tm?.pointsFor, 0),
        pointsAgainst: num(tm?.pointsAgainst, 0),
        playoffResult,
        regularSeasonFinish,
      };
    })
  );

  const seasonsFound = history.filter((h) => (h as any).found);

  const totals = seasonsFound.reduce(
    (acc, hAny) => {
      const h = hAny as any;
      acc.w += h.wins || 0;
      acc.l += h.losses || 0;
      acc.t += h.ties || 0;
      acc.pf += h.pointsFor || 0;
      acc.pa += h.pointsAgainst || 0;
      if (typeof h.regularSeasonFinish === 'number' && h.regularSeasonFinish === 1) {
        acc.titles += 1; // titles = number of #1 regular-season finishes
      }
      return acc;
    },
    {
      w: 0,
      l: 0,
      t: 0,
      pf: 0,
      pa: 0,
      titles: 0,
    }
  );

  // optimization
  const optimizationTips: string[] = [];

  if (posCounts.QB >= 3)
    optimizationTips.push('Consider trading or cutting a QB for a position of need');
  if (posCounts.RB >= 7)
    optimizationTips.push('Consider trading or cutting a RB for a position of need');
  if (posCounts.WR >= 8)
    optimizationTips.push('Consider trading or cutting a WR for a position of need');
  if (posCounts.TE >= 3)
    optimizationTips.push('Consider trading or cutting a TE for a position of need');
  if (posCounts.DST >= 3)
    optimizationTips.push('Consider trading or cutting a D/ST for a position of need');
  if (posCounts.K >= 3)
    optimizationTips.push('Consider trading or cutting a K for a position of need');

  if (pf > pa) {
    optimizationTips.push(
      "You're doing great scoring points, just make sure the opponents scoring stays low"
    );
  } else if (pa > pf) {
    optimizationTips.push(
      'Your opponents have scored more than you over the course of the season, consider looking for higher scoring players or a deeper roster to boost your PF'
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Background logo – same style as Contact page */}
      <img
        src="/logo_transparent.png"
        alt="ANFF watermark"
        className="fixed inset-0 h-full w-full select-none object-contain opacity-8 pointer-events-none"
        style={{ objectPosition: 'center' }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-1 text-xs text-gray-400">
            <Link href="/teams" className="text-blue-400 hover:text-blue-300">
              Teams
            </Link>{' '}
            · League {keyParam}
          </div>
          <h1 className="text-3xl font-extrabold">{team.name}</h1>
          <div className="mt-1 text-gray-400">
            Owner: <span className="font-mono">{owner}</span>
            {team.abbrev ? (
              <>
                {' '}
                · <span className="uppercase">{team.abbrev}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Meta summary */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-800 bg-black/30 p-3 text-center">
            <div className="text-xs text-gray-400">Seasons</div>
            <div className="font-semibold">
              {history.at(-1)?.season ?? MIN_YEAR_BY_LEAGUE[keyParam]}–{history[0]?.season} (
              {seasonsFound.length})
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/30 p-3 text-center">
            <div className="text-xs text-gray-400">All-time W-L-T</div>
            <div className="font-semibold">
              {totals.w}-{totals.l}
              {totals.t ? `-${totals.t}` : ''}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/30 p-3 text-center">
            <div className="text-xs text-gray-400">Titles</div>
            <div className="font-semibold">{totals.titles}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/30 p-3 text-center">
            <div className="text-xs text-gray-400">Total PF</div>
            <div className="font-semibold">{totals.pf.toFixed(1)}</div>
          </div>
        </div>

        {/* Layout — roster left, season/history right */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          {/* Current Roster */}
          <section className="rounded-2xl border border-gray-800 bg-black/40 p-4 lg:col-span-2">
            <h2 className="mb-3 text-center text-xl font-semibold">Current Roster</h2>
            {players.length === 0 ? (
              <div className="text-sm text-amber-300">
                No players yet — likely pre-draft.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Starters */}
                  <div>
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Starters
                    </div>
                    {orderedStarters.length === 0 ? (
                      <div className="text-center text-xs text-gray-500">
                        No starters listed.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderedStarters.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-xl border border-gray-800 bg-black/30 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wide ${getPosTextClasses(
                                  p.position
                                )}`}
                              >
                                {p.position || p.lineupSlot || '—'}
                              </span>
                              <div className="flex-1 text-center">
                                <div className="w-full truncate text-sm font-medium">
                                  {p.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bench + IR */}
                  <div className="space-y-4">
                    {/* Bench */}
                    <div>
                      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Bench
                      </div>
                      {bench.length === 0 ? (
                        <div className="text-center text-xs text-gray-500">
                          No bench players.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bench.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl border border-gray-800 bg-black/30 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wide ${getPosTextClasses(
                                    p.position
                                  )}`}
                                >
                                  {p.position || p.lineupSlot || '—'}
                                </span>
                                <div className="flex-1 text-center">
                                  <div className="w-full truncate text-sm font-medium">
                                    {p.name}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* IR */}
                    <div>
                      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-red-400">
                        Injured Reserve
                      </div>
                      {ir.length === 0 ? (
                        <div className="text-center text-xs text-gray-500">
                          No IR players.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {ir.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl border border-gray-800 bg-black/30 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wide ${getPosTextClasses(
                                    p.position
                                  )}`}
                                >
                                  {p.position || 'IR'}
                                </span>
                                <div className="flex-1 text-center">
                                  <div className="w-full truncate text-sm font-medium">
                                    {p.name}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Position counts */}
                <div className="mt-4 border-t border-gray-800 pt-3 text-xs">
                  <div className="mb-1 text-center text-gray-400 uppercase tracking-wide">
                    Position Counts
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('QB')}>QB:</span>
                      <span className="text-white">{posCounts.QB}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('RB')}>RB:</span>
                      <span className="text-white">{posCounts.RB}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('WR')}>WR:</span>
                      <span className="text-white">{posCounts.WR}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('TE')}>TE:</span>
                      <span className="text-white">{posCounts.TE}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('D/ST')}>D/ST:</span>
                      <span className="text-white">{posCounts.DST}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getPosTextClasses('K')}>K:</span>
                      <span className="text-white">{posCounts.K}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Season + history */}
          <section className="space-y-4 lg:col-span-3">
            {/* Team Optimization */}
            <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
              <h2 className="mb-3 text-center text-xl font-semibold">Team Optimization</h2>
              {optimizationTips.length === 0 ? (
                <div className="text-center text-sm text-gray-400">
                  No obvious optimization tips right now. Keep monitoring your roster and matchups.
                </div>
              ) : (
                <ul className="space-y-2 text-sm text-gray-100">
                  {optimizationTips.map((tip, idx) => (
                    <li key={idx} className="rounded-xl bg-black/50 px-3 py-2 text-center">
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Current Season – centered contents */}
            <div className="w-full rounded-2xl border border-gray-800 bg-black/40 p-4">
              <h2 className="mb-3 text-center text-xl font-semibold">
                Current Season {season}
              </h2>
              <div className="mx-auto max-w-xs space-y-1 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Record</span>
                  <span className="font-mono text-white">
                    {wins}-{losses}
                    {ties ? `-${ties}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Points For</span>
                  <span className="font-mono text-white">{pf.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Points Against</span>
                  <span className="font-mono text-white">{pa.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Win%</span>
                  <span className="font-mono text-white">
                    {games > 0 ? winPctSeason.toFixed(3) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Rank</span>
                  <span className="font-mono text-white">
                    {typeof currentRank === 'number' ? `#${currentRank}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Streak</span>
                  <span className="font-mono text-white">{streakDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Playoff %</span>
                  <span className="font-mono text-white">{playoffPctDisplay}</span>
                </div>
              </div>
            </div>

            {/* Franchise History – no playoff column */}
            <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
              <h2 className="mb-3 text-center text-xl font-semibold">Franchise History</h2>
              <div className="flex w-full justify-center overflow-x-auto">
                <table className="w-full table-fixed text-xs md:text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="w-16 py-1 pr-2 text-left">Season</th>
                      <th className="py-1 pr-2 text-left">Team</th>
                      <th className="w-20 py-1 pr-2 text-right">Record</th>
                      <th className="w-16 py-1 pr-2 text-right">Win%</th>
                      <th className="w-16 py-1 pr-2 text-right">PF</th>
                      <th className="w-16 py-1 pr-2 text-right">PA</th>
                      <th className="w-16 py-1 text-right">Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const any = h as any;
                      const found = any.found;
                      const regFinish = any.regularSeasonFinish as number | undefined;

                      return (
                        <tr key={h.season} className="border-t border-gray-800">
                          <td className="py-1 pr-2 text-gray-300">{h.season}</td>
                          <td className="py-1 pr-2 truncate">
                            {found ? (
                              any.name
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="py-1 pr-2 text-right font-mono">
                            {found
                              ? `${any.wins}-${any.losses}${
                                  any.ties ? `-${any.ties}` : ''
                                }`
                              : '—'}
                          </td>
                          <td className="py-1 pr-2 text-right font-mono">
                            {found ? any.winPct.toFixed(3) : '—'}
                          </td>
                          <td className="py-1 pr-2 text-right font-mono">
                            {found ? any.pointsFor.toFixed(1) : '—'}
                          </td>
                          <td className="py-1 pr-2 text-right font-mono">
                            {found ? any.pointsAgainst.toFixed(1) : '—'}
                          </td>
                          <td className="py-1 text-right font-mono">
                            {found && typeof regFinish === 'number'
                              ? `#${regFinish}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-center text-xs text-gray-500">
                Showing seasons {history.at(-1)?.season ?? MIN_YEAR_BY_LEAGUE[keyParam]}–
                {history[0]?.season} (newest first).
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
