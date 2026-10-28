// app/standings/page.tsx
import 'server-only';
import Link from 'next/link';
import { buildEspnUrl, espnHeadersForLeague, toRecordRow } from '../../../lib/espn';

type LeagueKey = 'A' | 'B' | 'C';

type Row = {
  rank: number;
  teamId: number | string;
  name: string;

  wins: number;
  losses: number;
  ties: number;
  streak?: string;

  pointsFor: number;
  pointsAgainst: number;
};

type RowWithMeta = Row & {
  playoffChance?: number; // 0–1
  tag?: '*' | 'x' | 'e';
};

type ChanceRow = RowWithMeta & {
  chance: number; // 0–1
};

type LeagueSummary = {
  leagueId: string;
  season: string | number;
  leagueName: string;
  standings: Row[];
  key?: LeagueKey;
};

type GetLeagueOpts = {
  season: string | number;
  leagueId?: string;
  key?: LeagueKey;
};

/* key → numeric id */
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

/* ---------------- ESPN fetch ---------------- */
async function getLeagueSummaryDirect(opts: GetLeagueOpts) {
  const { season, leagueId: leagueIdParam, key } = opts;
  if (!season || (!leagueIdParam && !key)) {
    throw new Error('Missing season and leagueId or key');
  }

  const maybeKey: LeagueKey | undefined =
    key ||
    ((leagueIdParam && /^[ABC]$/i.test(leagueIdParam)
      ? (leagueIdParam.toUpperCase() as LeagueKey)
      : undefined));

  const resolvedLeagueId =
    (leagueIdParam && /^\d+$/.test(leagueIdParam) && leagueIdParam) ||
    (maybeKey && leagueIdFromKey(maybeKey)) ||
    undefined;

  if (!resolvedLeagueId) throw new Error('Unable to resolve leagueId');

  const headers = espnHeadersForLeague({ leagueId: resolvedLeagueId, key: maybeKey });

  const views = ['mSettings', 'mTeam', 'mStandings'];
  const tries = [
    { url: buildEspnUrl(season, resolvedLeagueId, views, true), host: 'reads' },
    { url: buildEspnUrl(season, resolvedLeagueId, views, false), host: 'main' },
  ];

  let okJson: any = null;
  for (const t of tries) {
    const res = await fetch(t.url, { headers, cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!res.ok || !ct.includes('application/json')) continue;
    try {
      okJson = JSON.parse(text);
      break;
    } catch {
      // try next
    }
  }
  if (!okJson) throw new Error(`ESPN fetch failed for league ${resolvedLeagueId}`);

  const data: any = okJson;
  const leagueName =
    data?.settings?.name || data?.metadata?.leagueName || `League ${resolvedLeagueId}`;

  const rawTeams = Array.isArray(data?.teams) ? data.teams : [];
  const sortedTeams = [...rawTeams].sort((a: any, b: any) => {
    const ar = a?.record?.overall || {};
    const br = b?.record?.overall || {};
    if ((br.wins ?? 0) !== (ar.wins ?? 0)) return (br.wins ?? 0) - (ar.wins ?? 0);
    const apf = ar.pointsFor ?? 0;
    const bpf = br.pointsFor ?? 0;
    if (bpf !== apf) return bpf - apf;
    return (a.id ?? 0) - (b.id ?? 0);
  });

  const standings: Row[] = sortedTeams.map((t: any, i: number) => {
    const r: any = toRecordRow(t, i + 1);
    const overall = t?.record?.overall ?? {};

    const pointsFor = Number(r.pointsFor ?? overall.pointsFor ?? 0);
    const pointsAgainst = Number(r.pointsAgainst ?? overall.pointsAgainst ?? 0);

    return {
      rank: r.rank ?? i + 1,
      teamId: r.teamId ?? t.id,
      name: r.name ?? `${t.location ?? ''} ${t.nickname ?? ''}`.trim(),

      wins: Number(overall.wins ?? r.wins ?? 0),
      losses: Number(overall.losses ?? r.losses ?? 0),
      ties: Number(overall.ties ?? r.ties ?? 0),

      streak: r.streak ?? overall.streak ?? undefined,

      pointsFor,
      pointsAgainst,
    };
  });

  return {
    leagueId: String(resolvedLeagueId),
    season,
    leagueName,
    standings,
    key: maybeKey,
  } as LeagueSummary;
}

/* ---------------- styling ---------------- */
function sectionAccent(leagueName: string) {
  const isA = /(^|\s)A(\s|$)/i.test(leagueName) || /ANFF A/i.test(leagueName);
  const isB = /(^|\s)B(\s|$)/i.test(leagueName) || /ANFF B/i.test(leagueName);
  const color = isA ? 'red' : isB ? 'blue' : 'orange';
  const ring =
    color === 'red'
      ? 'ring-red-500/40 before:bg-red-500'
      : color === 'blue'
      ? 'ring-blue-500/40 before:bg-blue-500'
      : 'ring-orange-500/40 before:bg-orange-500';

  return [
    'relative rounded-2xl border border-gray-800 bg-black/30 ring-1',
    ring,
    'before:absolute before:left-4 before:right-4 before:top-0 before:h-1.5 before:rounded-full content-[""]',
  ].join(' ');
}

// 1–7 playoff bound (green), 8–12 relegation zone (red)
function nameColorClass(rank: number) {
  if (rank >= 1 && rank <= 7) return 'text-green-400 font-semibold';
  if (rank >= 8) return 'text-red-400 font-semibold';
  return '';
}

/* --------- % chance helpers ---------- */

const REGULAR_SEASON_WEEKS = 14;

function isRegularSeasonDoneFromRows(
  rows: { wins: number; losses: number; ties: number }[],
): boolean {
  if (!rows.length) return false;
  const totalGamesCounted = rows.reduce(
    (sum, r) => sum + r.wins + r.losses + r.ties,
    0,
  );
  const avgGamesPlayed = totalGamesCounted / rows.length;
  return avgGamesPlayed >= REGULAR_SEASON_WEEKS;
}

/**
 * Estimate playoff chances for each team.
 * Wins first, PF second. Strong late-season drop for teams 3+ wins behind 7th.
 */
function estimatePlayoffChanceMap(rows: Row[]): Record<string, number> {
  if (!rows.length) return {};

  const pfValues = rows.map((r) => r.pointsFor);
  const maxPF = Math.max(...pfValues);
  const minPF = Math.min(...pfValues);
  const span = maxPF - minPF || 1;

  const totalGamesCounted = rows.reduce(
    (sum, r) => sum + r.wins + r.losses + r.ties,
    0,
  );
  const avgGamesPlayed = totalGamesCounted / rows.length;
  const leagueProgress = Math.max(
    0,
    Math.min(1, avgGamesPlayed / REGULAR_SEASON_WEEKS),
  );

  const seventh = rows[6];
  const seventhWins = seventh?.wins ?? 0;
  const eighth = rows[7];
  const eighthWins = eighth?.wins ?? 0;

  const baseByRank: Record<number, number> = {
    1: 0.97,
    2: 0.94,
    3: 0.9,
    4: 0.85,
    5: 0.8,
    6: 0.74,
    7: 0.66,
    8: 0.48,
    9: 0.36,
    10: 0.24,
    11: 0.16,
    12: 0.1,
  };

  const map: Record<string, number> = {};

  for (const r of rows) {
    const gamesPlayed = r.wins + r.losses + r.ties;
    const winsBehind7 = Math.max(0, seventhWins - r.wins);
    const winsAhead8 = r.wins - (eighthWins ?? 0);

    let base = baseByRank[r.rank] ?? 0.25;

    if (r.rank <= 7) {
      if (winsAhead8 >= 2) base += 0.06;
      else if (winsAhead8 === 1) base += 0.03;
    } else {
      base -= 0.09 * winsBehind7;
    }

    const pfPos = (r.pointsFor - minPF) / span; // 0..1
    base += (pfPos - 0.5) * (0.12 + 0.08 * leagueProgress);

    if (r.rank === 1) base += 0.03;
    else if (r.rank === 2) base += 0.015;

    const teamProgress = Math.max(
      0,
      Math.min(1, gamesPlayed / REGULAR_SEASON_WEEKS),
    );
    const factor = 0.6 + 0.4 * Math.max(leagueProgress, teamProgress);
    base = 0.5 + (base - 0.5) * factor;

    if (leagueProgress > 0.75 && winsBehind7 >= 3) {
      base = Math.min(base, 0.07);
    }

    // Clamp and slight smoothing around 50
    let clamped = Math.max(0.03, Math.min(0.98, base));
    clamped = 0.5 + (clamped - 0.5) * 0.9;

    map[String(r.teamId)] = clamped;
  }

  return map;
}

/**
 * Promotion chances (B→A, C→B).
 * For seeds 1–7: strictly ordered by playoffChance (wins), PF only breaks ties.
 * For non-playoff teams: long shots scaled off playoffChance.
 */
function estimatePromotionChances(rows: RowWithMeta[]): ChanceRow[] {
  if (!rows.length) return [];

  const pfValues = rows.map((r) => r.pointsFor);
  const maxPF = Math.max(...pfValues);
  const minPF = Math.min(...pfValues);
  const pfSpan = maxPF - minPF || 1;

  const main = rows.filter((r) => r.rank <= 7);
  const extras = rows.filter((r) => r.rank > 7);

  const mainWithScore = main.map((r) => {
    const play = r.playoffChance ?? 0;
    const pfNorm = (r.pointsFor - minPF) / pfSpan;
    return {
      ...r,
      __score: play + pfNorm * 0.08, // PF only nudges
    };
  });

  mainWithScore.sort((a, b) => b.__score - a.__score);

  const maxPlayTop7 = Math.max(...mainWithScore.map((r) => r.playoffChance ?? 0));
  const minPlayTop7 = Math.min(...mainWithScore.map((r) => r.playoffChance ?? 0));
  const playSpanTop7 = maxPlayTop7 - minPlayTop7 || 1;

  const result: ChanceRow[] = [];

  // Map seeds 1–7 into ~55–88%, monotonic in playoffChance
  for (const r of mainWithScore) {
    const p = r.playoffChance ?? 0;
    const playNorm = (p - minPlayTop7) / playSpanTop7; // 0..1
    let chance = 0.55 + playNorm * 0.33; // 0.55–0.88

    // tiny PF bump for tie-breaking only
    const pfNorm = (r.pointsFor - minPF) / pfSpan;
    chance += (pfNorm - 0.5) * 0.04;

    // small bump if currently higher seed (1–3)
    if (r.rank === 1) chance += 0.02;
    else if (r.rank === 2) chance += 0.015;
    else if (r.rank === 3) chance += 0.01;

    chance = Math.max(0.5, Math.min(0.9, chance));

    result.push({ ...r, chance });
  }

  // Non-playoff long-shots
  for (const r of extras) {
    const play = r.playoffChance ?? 0;
    // map playoffChance (0–0.5ish) into ~0.18–0.4
    let chance = 0.18 + Math.min(play, 0.5) * 0.44;
    const pfNorm = (r.pointsFor - minPF) / pfSpan;
    chance += (pfNorm - 0.5) * 0.04;

    chance = 0.18 + (chance - 0.18) * 0.8;
    chance = Math.max(0.15, Math.min(0.55, chance));

    result.push({ ...r, chance });
  }

  // Rescale all promotion chances into 40–70% band, preserving ordering
  if (!result.length) return result;
  const minChance = Math.min(...result.map((r) => r.chance));
  const maxChance = Math.max(...result.map((r) => r.chance));
  const span = maxChance - minChance || 1;
  const LOW = 0.4;
  const HIGH = 0.7;

  return result.map((r) => {
    const norm = (r.chance - minChance) / span; // 0..1
    const stretched = LOW + norm * (HIGH - LOW);
    return { ...r, chance: stretched };
  });
}

/**
 * Relegation chances (A→B, B→C).
 * Focused on low PF and low playoffChance; wins matter lightly.
 */
function estimateRelegationChances(rows: RowWithMeta[]): ChanceRow[] {
  if (!rows.length) return [];

  const pfValues = rows.map((r) => r.pointsFor);
  const maxPF = Math.max(...pfValues);
  const minPF = Math.min(...pfValues);
  const span = maxPF - minPF || 1;

  const pfAsc = [...rows].sort((a, b) => a.pointsFor - b.pointsFor);
  const lowestId = pfAsc[0]?.teamId;
  const secondLowestId = pfAsc[1]?.teamId;

  const minWins = Math.min(...rows.map((r) => r.wins));
  const maxWins = Math.max(...rows.map((r) => r.wins));

  const withChance: ChanceRow[] = rows.map((r) => {
    const play = r.playoffChance ?? 0.2;
    const pfScore = (r.pointsFor - minPF) / span;
    const pfRisk = 1 - pfScore;
    const winScore = (r.wins - minWins) / (maxWins - minWins || 1);
    const winRisk = 1 - winScore;

    let base: number;

    if (r.rank >= 8) {
      base = 0.45 + 0.08 * (r.rank - 8);
    } else {
      base = 0.05 + 0.012 * (7 - r.rank);
    }

    base += (pfRisk - 0.5) * 0.32;
    base += (winRisk - 0.5) * 0.1;

    const longshotFactor = 1 - play;
    base = base * (0.6 + 0.4 * longshotFactor);

    if (String(r.teamId) === String(lowestId)) base += 0.1;
    else if (String(r.teamId) === String(secondLowestId)) base += 0.05;

    if (play > 0.7 && r.rank <= 7) {
      base = Math.min(base, 0.05);
    }

    base = 0.5 + (base - 0.5) * 0.7;

    const chance = Math.max(0.05, Math.min(0.9, base));
    return { ...r, chance };
  });

  // Always sort highest → lowest %, regardless of fringe styling later
  withChance.sort((a, b) => b.chance - a.chance);

  // Rescale all relegation chances into 40–70% band, preserving ordering
  const minChance = Math.min(...withChance.map((r) => r.chance));
  const maxChance = Math.max(...withChance.map((r) => r.chance));
  const span2 = maxChance - minChance || 1;
  const LOW = 0.4;
  const HIGH = 0.7;

  return withChance.map((r) => {
    const norm = (r.chance - minChance) / span2;
    const stretched = LOW + norm * (HIGH - LOW);
    return { ...r, chance: stretched };
  });
}

/**
 * Add playoffChance + tag (*, x, e) to standings.
 *
 * - Weeks 1–14: predictive tags based on possible outcomes.
 * - Weeks 15–17 (regular season done): rank 1 → *, ranks 2–7 → x, ranks 8–12 → e,
 *   with playoffChance forced to 1 or 0 accordingly.
 */
function annotateStandingsWithPlayoffMeta(rows: Row[]): RowWithMeta[] {
  if (!rows.length) return [];

  const regularSeasonDone = isRegularSeasonDoneFromRows(rows);

  // Post–regular season: everything is locked for *tags*,
  // but we still keep playoffChance probabilistic for promo/releg.
  if (regularSeasonDone) {
    const chanceMap = estimatePlayoffChanceMap(rows);
    return rows.map((r) => {
      let tag: RowWithMeta['tag'];
      if (r.rank === 1) tag = '*';
      else if (r.rank >= 2 && r.rank <= 7) tag = 'x';
      else tag = 'e'; // bottom 5 eliminated

      return {
        ...r,
        playoffChance: chanceMap[String(r.teamId)],
        tag,
      };
    });
  }

  // Weeks 1–14: predictive tagging/percentages.
  const chanceMap = estimatePlayoffChanceMap(rows);
  const totalWeeks = REGULAR_SEASON_WEEKS;

  const minWinsNeededForPlayoffs = rows[6]?.wins ?? 0;

  const maxPossibleWinsNonPlayoff =
    rows
      .filter((r) => r.rank >= 8)
      .map((t) => {
        const gamesPlayed = t.wins + t.losses + t.ties;
        const remaining = totalWeeks - gamesPlayed;
        return t.wins + Math.max(0, remaining);
      })
      .reduce((acc, v) => Math.max(acc, v), 0) || 0;

  const maxPossibleWinsAfter1 =
    rows
      .filter((r) => r.rank > 1)
      .map((t) => {
        const gamesPlayed = t.wins + t.losses + t.ties;
        const remaining = totalWeeks - gamesPlayed;
        return t.wins + Math.max(0, remaining);
      })
      .reduce((acc, v) => Math.max(acc, v), 0) || 0;

  return rows.map((r) => {
    const gamesPlayed = r.wins + r.losses + r.ties;
    const remaining = totalWeeks - gamesPlayed;
    const maxPossibleWins = r.wins + Math.max(0, remaining);
    const minIfLoseOut = r.wins;

    let tag: RowWithMeta['tag'] | undefined;

    // Eliminated from playoffs
    if (maxPossibleWins < minWinsNeededForPlayoffs) tag = 'e';

    // Clinched at least a playoff spot
    if (minIfLoseOut > maxPossibleWinsNonPlayoff) tag = 'x';

    // Clinched 1 seed
    if (r.rank === 1 && minIfLoseOut > maxPossibleWinsAfter1) tag = '*';

    return {
      ...r,
      playoffChance: chanceMap[String(r.teamId)],
      tag,
    };
  });
}

/* ---------------- small UI bits ---------------- */
function Table({ rows, leagueId }: { rows: RowWithMeta[]; leagueId: string }) {
  const pfValues = rows.map((r) => r.pointsFor);
  const maxPF = pfValues.length ? Math.max(...pfValues) : 0;
  const minPF = pfValues.length ? Math.min(...pfValues) : 0;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-800">
      <table className="min-w-full text-left">
        <thead className="bg-black/40">
          <tr>
            <th className="px-4 py-2 text-center">Rank</th>
            <th className="px-4 py-2 text-left">Team</th>
            <th className="px-4 py-2 text-center">W</th>
            <th className="px-4 py-2 text-center">L</th>
            <th className="px-4 py-2 text-center">T</th>
            <th className="px-4 py-2 text-center">PF</th>
            <th className="px-4 py-2 text-center">PA</th>
            <th className="px-4 py-2 text-center text-xs sm:text-sm">Playoff %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isMaxPF = r.pointsFor === maxPF;
            const isMinPF = r.pointsFor === minPF;

            const striping = i % 2 ? 'bg-black/10' : '';
            const baseBorder =
              r.rank === 7
                ? 'border-b-[3px] border-yellow-400'
                : 'border-b border-gray-800';

            let rowClass = `relative ${striping} ${baseBorder}`;

            if (isMaxPF) {
              rowClass +=
                ' border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,.7)] outline outline-1 outline-emerald-300';
            } else if (isMinPF) {
              rowClass +=
                ' border-2 border-red-500 bg-red-500/15 shadow-[0_0_0_1px_rgba(239,68,68,.7)] outline outline-1 outline-red-400';
            }

            const pfTextClass = isMaxPF
              ? 'text-yellow-300 font-semibold'
              : isMinPF
              ? 'text-orange-400 font-semibold'
              : 'text-gray-100';

            let displayChance: number | null = null;
            if (r.tag === 'e') displayChance = 0;
            else if (r.tag === 'x' || r.tag === '*') displayChance = 1;
            else if (r.playoffChance != null) displayChance = r.playoffChance;

            return (
              <tr key={r.teamId} className={rowClass}>
                <td className="px-4 py-2 tabular-nums text-center">{r.rank}</td>
                <td className="px-4 py-2 text-left text-sm sm:text-base truncate">
                  <Link
                    href={`/teams?leagueId=${leagueId}&teamId=${r.teamId}`}
                    className="flex items-center gap-1 hover:underline"
                  >
                    {r.tag && (
                      <span className="font-mono font-bold text-white mr-0.5">
                        {r.tag}
                      </span>
                    )}
                    <span className={nameColorClass(r.rank)}>{r.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-2 tabular-nums text-center">{r.wins}</td>
                <td className="px-4 py-2 tabular-nums text-center">{r.losses}</td>
                <td className="px-4 py-2 tabular-nums text-center">{r.ties}</td>
                <td className={`px-4 py-2 tabular-nums text-center ${pfTextClass}`}>
                  {r.pointsFor.toFixed(2)}
                </td>
                <td className="px-4 py-2 tabular-nums text-center">
                  {r.pointsAgainst.toFixed(2)}
                </td>
                <td className="px-4 py-2 tabular-nums text-center whitespace-nowrap">
                  {displayChance != null ? `${Math.round(displayChance * 100)}%` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LegendRow() {
  return (
    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-300 mb-4">
      <span className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: 'rgb(16 185 129)' }}
        />{' '}
        Playoffs
      </span>
      <span className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: 'rgb(239 68 68)' }}
        />{' '}
        Relegation Zone
      </span>
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-400" /> PF
        Promotion
      </span>
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-red-500/30 border border-red-400" /> PF Relegation
      </span>
      <span className="flex items-center gap-2">
        <span className="w-6 h-0.5 rounded-full bg-yellow-300" /> Playoff Boundary
      </span>
    </div>
  );
}

/* ------------------------------- page ------------------------------- */
export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string; key?: LeagueKey }>;
}) {
  const resolvedSearchParams = await searchParams;
  const season = process.env.ESPN_SEASON || '';
  if (!season) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Standings</h1>
        <p className="mt-2 text-sm text-gray-300">
          Missing ESPN_SEASON in environment. Add it in Vercel → Project → Settings → Environment
          Variables.
        </p>
      </div>
    );
  }

  let leagues: LeagueSummary[] = [];
  try {
    if (resolvedSearchParams?.key || resolvedSearchParams?.leagueId) {
      leagues = [
        await getLeagueSummaryDirect({
          season,
          key: (resolvedSearchParams.key as LeagueKey) || undefined,
          leagueId: resolvedSearchParams.leagueId,
        }),
      ];
    } else {
      const [A, B, C] = await Promise.all([
        getLeagueSummaryDirect({ season, key: 'A' }),
        getLeagueSummaryDirect({ season, key: 'B' }),
        getLeagueSummaryDirect({ season, key: 'C' }),
      ]);
      leagues = [A, B, C];
    }
  } catch (e: any) {
    console.error('Standings load failed:', e?.message, e?.details);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Standings</h1>
        <p className="mt-2 text-sm text-gray-300">
          We couldn’t load standings right now. {e?.details?.hint ? `Hint: ${e.details.hint}` : ''}
        </p>
      </div>
    );
  }

  // De-dup by leagueId and pick A/B/C deterministically
  const byId = new Map<string, LeagueSummary>();
  for (const L of leagues) {
    if (!L?.leagueId) continue;
    if (!byId.has(L.leagueId)) byId.set(L.leagueId, L);
  }
  const unique = Array.from(byId.values());

  const pickByKey = (k: LeagueKey) =>
    unique.find((l) => l.key === k) ||
    unique.find((l) => new RegExp(`ANFF\\s+${k}\\b`, 'i').test(l.leagueName));

  const LA = pickByKey('A');
  const LB = pickByKey('B');
  const LC = pickByKey('C');

  const Arows = LA?.standings ?? [];
  const Brows = LB?.standings ?? [];
  const Crows = LC?.standings ?? [];

  const Ameta = annotateStandingsWithPlayoffMeta(Arows);
  const Bmeta = annotateStandingsWithPlayoffMeta(Brows);
  const Cmeta = annotateStandingsWithPlayoffMeta(Crows);

  // Determine phase: W1–14 vs W15–17 based on games played.
  const phaseSampleRows = Arows.length ? Arows : Brows.length ? Brows : Crows;
  const regularSeasonDone = isRegularSeasonDoneFromRows(phaseSampleRows);

  // promotion / relegation arrays
  let promoFromB: ChanceRow[] = [];
  let promoFromC: ChanceRow[] = [];
  let relegFromA: ChanceRow[] = [];
  let relegFromB: ChanceRow[] = [];

  // Always use probabilistic logic; only the *ranks included* change after season.
  const allPromoB = estimatePromotionChances(Bmeta);
  const allPromoC = estimatePromotionChances(Cmeta);
  const allRelegA = estimateRelegationChances(Ameta);
  const allRelegB = estimateRelegationChances(Bmeta);

  if (regularSeasonDone) {
    // After W14: promoted = playoff teams (top 7), relegated = eliminated (bottom 5)
    promoFromB = allPromoB.filter((t) => t.rank <= 7).sort((a, b) => b.chance - a.chance);
    promoFromC = allPromoC.filter((t) => t.rank <= 7).sort((a, b) => b.chance - a.chance);

    relegFromA = allRelegA.filter((t) => t.rank >= 8).sort((a, b) => b.chance - a.chance);
    relegFromB = allRelegB.filter((t) => t.rank >= 8).sort((a, b) => b.chance - a.chance);
  } else {
    // Weeks 1–14: promoted = top 8, relegated = bottom 7 (ranks 6–12)
    promoFromB = allPromoB.filter((t) => t.rank <= 8).sort((a, b) => b.chance - a.chance);
    promoFromC = allPromoC.filter((t) => t.rank <= 8).sort((a, b) => b.chance - a.chance);

    relegFromA = allRelegA.filter((t) => t.rank >= 6).sort((a, b) => b.chance - a.chance);
    relegFromB = allRelegB.filter((t) => t.rank >= 6).sort((a, b) => b.chance - a.chance);
  }

  const fmtPct = (p: number) => `${Math.round(p * 100)}%`;

  const maxPromoBPF = promoFromB.length ? Math.max(...promoFromB.map((t) => t.pointsFor)) : 0;
  const maxPromoCPF = promoFromC.length ? Math.max(...promoFromC.map((t) => t.pointsFor)) : 0;
  const minRelegAPF = relegFromA.length ? Math.min(...relegFromA.map((t) => t.pointsFor)) : 0;
  const minRelegBPF = relegFromB.length ? Math.min(...relegFromB.map((t) => t.pointsFor)) : 0;

  const renderLeagues: { summary: LeagueSummary; meta: RowWithMeta[] }[] = [];
  if (LA) renderLeagues.push({ summary: LA, meta: Ameta });
  if (LB) renderLeagues.push({ summary: LB, meta: Bmeta });
  if (LC) renderLeagues.push({ summary: LC, meta: Cmeta });

  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "url('/logo_transparent.png')",
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      />
      <div className="relative px-6 py-10">
        <h1 className="text-4xl font-extrabold text-center mb-2">Standings</h1>

        {/* Toilet Bowl button */}
        <div className="mt-4 mb-4 flex justify-center">
          <Link
            href="/toilet"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-black bg-[#F0EAD6] hover:bg-[#e4dcc8] shadow"
          >
            <span>Toilet Bowl</span>
            <span role="img" aria-label="toilet">
              🚽
            </span>
          </Link>
        </div>

        <div className="max-w-6xl mx-auto mt-2 mb-8 rounded-2xl border border-gray-800 bg-black/20 p-6 ring-1 ring-white/5">
          <h2 className="text-2xl font-bold text-center">
            Promotion &amp; Relegation{' '}
            <span className="text-gray-300 text-lg">(Probabilities)</span>
          </h2>
          <p className="text-xs text-center text-gray-400 mt-2">
            *Ranking <span className="underline">after playoffs &amp; toilet bowl</span>{' '}
            determines actual promotions and relegations. Current list shows estimated chances based
            on live standings and PF.
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A ↔ B */}
            <div className="rounded-2xl border border-gray-800 bg-black/25 p-4">
              <h3 className="text-center text-white font-semibold mb-3">Between A and B</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Promoted to A */}
                <div className="flex flex-col items-stretch">
                  <div className="text-sm text-red-400 mb-2 text-center">
                    Chance to be Promoted to A
                  </div>
                  <div className="space-y-2 w-full">
                    {promoFromB.map((t) => (
                      <div
                        key={t.teamId}
                        className="rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="font-semibold text-white w-12 shrink-0 tabular-nums">
                            {fmtPct(t.chance)}
                          </span>
                          <span className="truncate flex-1 text-left">{t.name}</span>
                          <span className="whitespace-nowrap shrink-0 text-gray-200 flex items-center gap-1 tabular-nums">
                            <span>#{t.rank}</span>
                            <span>·</span>
                            <span
                              className={
                                t.pointsFor === maxPromoBPF
                                  ? 'text-yellow-300 font-semibold'
                                  : 'text-gray-200'
                              }
                            >
                              {t.pointsFor.toFixed(1)}
                            </span>
                            <span>PF</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relegated to B */}
                <div className="flex flex-col items-stretch">
                  <div className="text-sm text-blue-400 mb-2 text-center">
                    Chance to be Relegated to B
                  </div>
                  <div className="space-y-2 w-full">
                    {relegFromA.map((t) => {
                      const pfIsLowest = t.pointsFor === minRelegAPF;

                      return (
                        <div
                          key={t.teamId}
                          className="rounded-xl px-3 py-2 border border-red-500/70 bg-red-500/10"
                        >
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="font-semibold text-white w-12 shrink-0 tabular-nums">
                              {fmtPct(t.chance)}
                            </span>
                            <span className="truncate flex-1 text-left">{t.name}</span>
                            <span className="whitespace-nowrap shrink-0 text-gray-200 flex items-center gap-1 tabular-nums">
                              <span>#{t.rank}</span>
                              <span>·</span>
                              <span
                                className={
                                  pfIsLowest
                                    ? 'text-orange-400 font-semibold'
                                    : 'text-gray-200'
                                }
                              >
                                {t.pointsFor.toFixed(1)}
                              </span>
                              <span>PF</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* B ↔ C */}
            <div className="rounded-2xl border border-gray-800 bg-black/25 p-4">
              <h3 className="text-center text-white font-semibold mb-3">Between B and C</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Promoted to B */}
                <div className="flex flex-col items-stretch">
                  <div className="text-sm text-blue-400 mb-2 text-center">
                    Chance to be Promoted to B
                  </div>
                  <div className="space-y-2 w-full">
                    {promoFromC.map((t) => (
                      <div
                        key={t.teamId}
                        className="rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="font-semibold text-white w-12 shrink-0 tabular-nums">
                            {fmtPct(t.chance)}
                          </span>
                          <span className="truncate flex-1 text-left">{t.name}</span>
                          <span className="whitespace-nowrap shrink-0 text-gray-200 flex items-center gap-1 tabular-nums">
                            <span>#{t.rank}</span>
                            <span>·</span>
                            <span
                              className={
                                t.pointsFor === maxPromoCPF
                                  ? 'text-yellow-300 font-semibold'
                                  : 'text-gray-200'
                              }
                            >
                              {t.pointsFor.toFixed(1)}
                            </span>
                            <span>PF</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relegated to C */}
                <div className="flex flex-col items-stretch">
                  <div className="text-sm text-orange-400 mb-2 text-center">
                    Chance to be Relegated to C
                  </div>
                  <div className="space-y-2 w-full">
                    {relegFromB.map((t) => {
                      const pfIsLowest = t.pointsFor === minRelegBPF;

                      return (
                        <div
                          key={t.teamId}
                          className="rounded-xl px-3 py-2 border border-red-500/70 bg-red-500/10"
                        >
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="font-semibold text-white w-12 shrink-0 tabular-nums">
                              {fmtPct(t.chance)}
                            </span>
                            <span className="truncate flex-1 text-left">{t.name}</span>
                            <span className="whitespace-nowrap shrink-0 text-gray-200 flex items-center gap-1 tabular-nums">
                              <span>#{t.rank}</span>
                              <span>·</span>
                              <span
                                className={
                                  pfIsLowest
                                    ? 'text-orange-400 font-semibold'
                                    : 'text-gray-200'
                                }
                              >
                                {t.pointsFor.toFixed(1)}
                              </span>
                              <span>PF</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="max-w-6xl mx-auto">
          <LegendRow />
        </div>

        {/* League sections */}
        <div className="space-y-10 max-w-6xl mx-auto">
          {renderLeagues.map(({ summary, meta }) => (
            <section key={summary.leagueId} className={sectionAccent(summary.leagueName)}>
              <div className="p-5">
                <h2 className="text-2xl font-bold mb-4 text-center">{summary.leagueName}</h2>
                <Table rows={meta} leagueId={summary.leagueId} />
              </div>
            </section>
          ))}
        </div>

        {/* Standings glossary */}
        <div className="max-w-md mx-auto mt-8 mb-4 rounded-2xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300 text-center">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Standings Glossary</h3>
          <ul className="space-y-1">
            <li>
              <span className="font-mono mr-1">x</span> – clinched playoffs
            </li>
            <li>
              <span className="font-mono mr-1">*</span> – clinched 1 seed
            </li>
            <li>
              <span className="font-mono mr-1">e</span> – eliminated from playoffs
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
 
