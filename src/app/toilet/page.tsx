// app/toilet/page.tsx
import 'server-only';
import Link from 'next/link';
import { buildEspnUrl, espnHeadersForLeague, toRecordRow } from '../../../lib/espn';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

type WeeklyPF = {
  week15: number;
  week16: number;
  week17: number;
  total: number;
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

/* ---------------- ESPN fetch: standings (same as standings page) ---------------- */
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

/* ---------------- ESPN fetch: Toilet Bowl weeks (15–17) ---------------- */
async function getToiletPFMap(
  season: string | number,
  leagueId: string,
  key?: LeagueKey,
): Promise<Record<string, WeeklyPF>> {
  const headers = espnHeadersForLeague({ leagueId, key });

  const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mMatchupScore`;

  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Toilet PF fetch failed for league ${leagueId} (status ${res.status})`);
  }
  const data: any = await res.json();
  const schedule: any[] = Array.isArray(data?.schedule) ? data.schedule : [];

  const raw: Record<string, { 15?: number; 16?: number; 17?: number }> = {};

  for (const m of schedule) {
    const week: number | undefined = m?.matchupPeriodId;
    if (week !== 15 && week !== 16 && week !== 17) continue;

    const addSide = (side: any) => {
      if (!side || side.teamId == null) return;
      const id = String(side.teamId);
      if (!raw[id]) raw[id] = {};
      const pts = typeof side.totalPoints === 'number' ? side.totalPoints : 0;
      raw[id][week] = (raw[id][week] ?? 0) + pts;
    };

    addSide(m.home);
    addSide(m.away);
  }

  const map: Record<string, WeeklyPF> = {};
  for (const [teamId, weeks] of Object.entries(raw)) {
    const w15 = weeks[15] ?? 0;
    const w16 = weeks[16] ?? 0;
    const w17 = weeks[17] ?? 0;
    const total = w15 + w16 + w17;
    map[teamId] = { week15: w15, week16: w16, week17: w17, total };
  }

  return map;
}
 
/* ---------------- MANUAL OVERRIDE (scores) ---------------- */
const MANUAL_TOILET_SCORES: Partial<
  Record<LeagueKey, Record<string, Partial<Pick<WeeklyPF, 'week15' | 'week16' | 'week17'>>>>
> = {
  A: {
    // Henry Ruggs's Bumper
    '9': { week15: 83.8, week16: 115.14, week17: 71.4 },
    // Busta Cherry
    '6': { week15: 107.3, week16: 102.5, week17: 107.2 },
    // Allgeieric to Winning
    '3': { week15: 158.9, week16: 132.12, week17: 69.4 },
    // Vado's Tennis Academy
    '4': { week15: 88.24, week16: 63.88, week17: 67.7 },
    // Drake "Drake Maye" Maye
    '13': { week15: 116.4, week16: 102.1, week17: 128.84 },
  },
  B: {
    // Alee(i)na2
    '2': { week15: 105.92, week16: 97.5, week17: 106.98 },
    // Fergasm
    '10': { week15: 114.34, week16: 96.12, week17: 100.68 },
    // LEROY JENKINS
    '14': { week15: 111.4, week16: 117.38, week17: 115.66 },
    // Amon-Ramen noodles
    '12': { week15: 149.46, week16: 80.34, week17: 88.02 },
    // Handsome Kings
    '6': { week15: 135, week16: 141.66, week17: 145.9 },
  },
  C: {
    // Your diggs small
    '8': { week15: 89.6, week16: 127.16, week17: 98.4 },
    // Irritable Bowers Syndrome
    '5': { week15: 99.12, week16: 113.76, week17: 100.18 },
    // Nash
    '11': { week15: 117.38, week16: 97.9, week17: 92.2 },
    // Alexis's Angry Team
    '4': { week15: 62.3, week16: 65.3, week17: 32.2 },
    // Alina's Awesome Team
    '12': { week15: 96.76, week16: 107.1, week17: 64.4 },
  },
};

/* ---------------- MANUAL AUTO-RELEGATION OVERRIDE ----------------
   Force the "lowest Season PF" team ID if you want to override ESPN-derived min PF logic.
   (Requested for League C: Nash = teamId 11)
------------------------------------------------------------------ */
const MANUAL_AUTO_RELEGATED: Partial<Record<LeagueKey, string>> = {
  C: '11',
};

function applyManualOverride(
  leagueKey: LeagueKey | undefined,
  teamId: string,
  fromApi: WeeklyPF,
): WeeklyPF {
  if (!leagueKey) return fromApi;

  const leagueMap = MANUAL_TOILET_SCORES[leagueKey];
  const override = leagueMap?.[teamId];
  if (!override) return fromApi;

  const week15 = typeof override.week15 === 'number' ? override.week15 : fromApi.week15;
  const week16 = typeof override.week16 === 'number' ? override.week16 : fromApi.week16;
  const week17 = typeof override.week17 === 'number' ? override.week17 : fromApi.week17;

  return { week15, week16, week17, total: week15 + week16 + week17 };
}

/* ---------------- styling ---------------- */
function leagueSectionAccent(key?: LeagueKey) {
  const color = key === 'A' ? 'red' : key === 'B' ? 'blue' : 'orange';
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

function leagueTitleColor(key?: LeagueKey) {
  if (key === 'A') return 'text-red-400';
  if (key === 'B') return 'text-blue-400';
  return 'text-orange-400';
}

/* ---------------- page ---------------- */
export default async function ToiletBowlPage() {
  const season = process.env.ESPN_SEASON || '';
  if (!season) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Toilet Bowl</h1>
        <p className="mt-2 text-sm text-gray-300">
          Missing ESPN_SEASON in environment. Add it in Vercel → Project → Settings → Environment Variables.
        </p>
      </div>
    );
  }

  const leagueKeys: LeagueKey[] = ['A', 'B', 'C'];
  const results = await Promise.allSettled(
    leagueKeys.map((k) => getLeagueSummaryDirect({ season, key: k })),
  );

  const leagues: LeagueSummary[] = results
    .filter((r): r is PromiseFulfilledResult<LeagueSummary> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (!leagues.length) {
    console.error(
      'Toilet Bowl load failed for all leagues',
      results.map((r) => (r.status === 'rejected' ? (r.reason as any)?.message : 'ok')),
    );
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Toilet Bowl</h1>
        <p className="mt-2 text-sm text-gray-300">We couldn’t load Toilet Bowl data right now.</p>
      </div>
    );
  }

  const leagueWithPF = await Promise.all(
    leagues.map(async (L) => {
      try {
        const pfMap = await getToiletPFMap(L.season, L.leagueId, L.key);
        return { summary: L, pfMap };
      } catch (err: any) {
        console.error('Toilet PF fetch failed for league', L.leagueId, err?.message);
        return { summary: L, pfMap: {} as Record<string, WeeklyPF> };
      }
    }),
  );

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
        <h1 className="text-4xl font-extrabold text-center mb-2">
          Toilet Bowl{' '}
          <span role="img" aria-label="toilet">
            🚽
          </span>
        </h1>
        <p className="text-center text-sm text-gray-300 max-w-2xl mx-auto">
          Bottom-five teams from each league battle it out in Weeks 15, 16, and 17. Total points
          scored across those weeks determine the final Toilet Bowl standings.
        </p>

        <div className="mt-4 mb-8 flex justify-center">
          <Link
            href="/rules"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-black bg-[#F0EAD6] hover:bg-[#e4dcc8] shadow"
          >
            View Rules &amp; Constitution
          </Link>
        </div>

        <div className="space-y-10 max-w-6xl mx-auto">
          {leagueWithPF.map(({ summary, pfMap }) => {
            const key = summary.key;
            const displayName = summary.leagueName.replace(/\s+League\b/i, '');

            // Auto-relegated team (lowest Season PF) — with optional manual override.
            let autoId: string | null = null;
            const forcedAuto = key ? MANUAL_AUTO_RELEGATED[key] : undefined;
            if (forcedAuto) {
              autoId = String(forcedAuto);
            } else if (summary.standings.length) {
              const minRow = summary.standings.reduce((min, r) =>
                r.pointsFor < min.pointsFor ? r : min,
              );
              autoId = String(minRow.teamId);
            }

            const zeroWeek: WeeklyPF = { week15: 0, week16: 0, week17: 0, total: 0 };
            type RowWithWeek = { row: Row; week: WeeklyPF };

            const sortedByRank = [...summary.standings].sort((a, b) => a.rank - b.rank);
            const bottomFiveBase = sortedByRank.filter((r) => r.rank >= 8).slice(0, 5);

            const bottomWithWeek: RowWithWeek[] = bottomFiveBase.map((r) => {
              const base = pfMap[String(r.teamId)] || zeroWeek;
              const w = applyManualOverride(key, String(r.teamId), base);
              return { row: r, week: w };
            });

            // Bottom-3 by Toilet PF (ascending totals).
            const ascByTotal = [...bottomWithWeek].sort((a, b) => a.week.total - b.week.total);
            const bottom3Set = new Set<string>(
              ascByTotal.slice(0, 3).map((x) => String(x.row.teamId)),
            );

            // Default display: Toilet PF DESC
            let displayRows: RowWithWeek[] = [...bottomWithWeek].sort(
              (a, b) => b.week.total - a.week.total,
            );

            // ====== YOUR RULE (implemented correctly) ======
            // If auto team is NOT in the Toilet bottom-3 by points, force them into rank #3.
            // This means: remove auto, sort remaining by Toilet PF DESC, insert auto at index 2.
            let autoForcedToThird = false;
            if (autoId && !bottom3Set.has(autoId)) {
              const autoItem = bottomWithWeek.find((x) => String(x.row.teamId) === autoId);
              if (autoItem) {
                const others = bottomWithWeek
                  .filter((x) => String(x.row.teamId) !== autoId)
                  .sort((a, b) => b.week.total - a.week.total);

                displayRows = [...others.slice(0, 2), autoItem, ...others.slice(2)];
                autoForcedToThird = true;
              }
            }
            // ==============================================

            // Weekly highs/lows among bottom 5.
            const hasToiletActivity = bottomWithWeek.some(
              (x) => x.week.week15 !== 0 || x.week.week16 !== 0 || x.week.week17 !== 0,
            );

            const week15Vals = bottomWithWeek.map((x) => x.week.week15);
            const week16Vals = bottomWithWeek.map((x) => x.week.week16);
            const week17Vals = bottomWithWeek.map((x) => x.week.week17);

            const w15Max = week15Vals.length ? Math.max(...week15Vals) : 0;
            const w15Min = week15Vals.length ? Math.min(...week15Vals) : 0;
            const w16Max = week16Vals.length ? Math.max(...week16Vals) : 0;
            const w16Min = week16Vals.length ? Math.min(...week16Vals) : 0;
            const w17Max = week17Vals.length ? Math.max(...week17Vals) : 0;
            const w17Min = week17Vals.length ? Math.min(...week17Vals) : 0;

            const highlightW15 = hasToiletActivity && w15Max > w15Min;
            const highlightW16 = hasToiletActivity && w16Max > w16Min;
            const highlightW17 = hasToiletActivity && w17Max > w17Min;

            return (
              <section key={summary.leagueId} className={leagueSectionAccent(key)}>
                <div className="p-5">
                  <h2 className={'text-2xl font-bold mb-4 text-center ' + leagueTitleColor(key)}>
                    {displayName}
                  </h2>

                  <div className="overflow-x-auto rounded-2xl border border-gray-800">
                    <table className="min-w-full text-left">
                      <thead className="bg-black/40">
                        <tr>
                          <th className="px-4 py-2 text-center">Rank</th>
                          <th className="px-4 py-2 text-left">Team</th>
                          <th className="px-4 py-2 text-center">Toilet PF (15–17)</th>
                          <th className="px-4 py-2 text-center">Week 15</th>
                          <th className="px-4 py-2 text-center">Week 16</th>
                          <th className="px-4 py-2 text-center">Week 17</th>
                          <th className="px-4 py-2 text-center">Season PF</th>
                        </tr>
                      </thead>

                      <tbody>
                        {displayRows.map(({ row: t, week }, idx) => {
                          const idStr = String(t.teamId);
                          const isAuto = autoId != null && idStr === autoId;

                          // rank 1–2 green, 3–5 red (auto always red)
                          let nameClass = 'text-white';
                          if (isAuto) nameClass = 'text-red-400 font-semibold';
                          else if (idx <= 1) nameClass = 'text-emerald-400 font-semibold';
                          else nameClass = 'text-red-400 font-semibold';

                          const showAutoStar = isAuto && autoForcedToThird;

                          const w15Class =
                            highlightW15 && week.week15 === w15Max
                              ? 'text-yellow-300 font-semibold'
                              : highlightW15 && week.week15 === w15Min
                              ? 'text-orange-400 font-semibold'
                              : 'text-gray-100';

                          const w16Class =
                            highlightW16 && week.week16 === w16Max
                              ? 'text-yellow-300 font-semibold'
                              : highlightW16 && week.week16 === w16Min
                              ? 'text-orange-400 font-semibold'
                              : 'text-gray-100';

                          const w17Class =
                            highlightW17 && week.week17 === w17Max
                              ? 'text-yellow-300 font-semibold'
                              : highlightW17 && week.week17 === w17Min
                              ? 'text-orange-400 font-semibold'
                              : 'text-gray-100';

                          const seasonPFClass = isAuto
                            ? 'text-red-400 font-semibold'
                            : 'text-gray-100';

                          // flush + slightly thicker red divider between row 2 and 3:
                          // add a border-top to row #3 (idx === 2)
                          let rowClass =
                            'border-b border-gray-800 ' + (idx % 2 ? 'bg-black/10' : '');
                          if (idx === 2) rowClass += ' border-t-2 border-red-500/80';
                          if (isAuto) rowClass += ' bg-red-500/20';

                          return (
                            <tr key={t.teamId} className={rowClass}>
                              <td className="px-4 py-2 text-center tabular-nums">{idx + 1}</td>
                              <td className="px-4 py-2 text-left text-sm sm:text-base truncate">
                                <span className={nameClass}>
                                  {t.name}
                                  {showAutoStar ? ' *' : ''}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center tabular-nums text-gray-100">
                                {week.total.toFixed(2)}
                              </td>
                              <td className={'px-4 py-2 text-center tabular-nums ' + w15Class}>
                                {week.week15.toFixed(2)}
                              </td>
                              <td className={'px-4 py-2 text-center tabular-nums ' + w16Class}>
                                {week.week16.toFixed(2)}
                              </td>
                              <td className={'px-4 py-2 text-center tabular-nums ' + w17Class}>
                                {week.week17.toFixed(2)}
                              </td>
                              <td className={'px-4 py-2 text-center tabular-nums ' + seasonPFClass}>
                                {t.pointsFor.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {autoForcedToThird && (
                    <p className="mt-2 text-xs text-gray-300 text-center">
                      * Lowest Season PF — forced into the bottom 3 at #3 regardless of Toilet PF.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="max-w-xl mx-auto mt-8 mb-4 rounded-2xl border border-gray-700 bg-black/40 p-4 text-sm text-center">
          <p className="text-gray-200 font-semibold">
            In each league, the team with the{' '}
            <span className="underline">lowest season PF</span> is automatically relegated,
            regardless of Toilet Bowl results.
          </p>
          <p className="mt-2 text-gray-300">
            Full details are outlined in the{' '}
            <Link href="/rules" className="text-[#F0EAD6] underline underline-offset-2">
              ANFF Rules &amp; Constitution
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
