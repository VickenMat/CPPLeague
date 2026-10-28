/* eslint-disable @next/next/no-img-element */
// app/leagues/page.tsx
import { serverBaseUrl } from '../../../lib/serverUrl';
import { fetchJson } from '../../../lib/http';

type LeagueKey = 'A' | 'B' | 'C';

type HistoryChampion = {
  owner?: string;
  team?: string;
  wins?: number;
  losses?: number;
  ties?: number;
};

type SummaryTeam = {
  id?: string | number;
  name?: string;
  primaryOwner?: string | number;
  owners?: Array<string | number>;
  finalRank?: number | null;
  finalStanding?: number | null;
  rankCalculatedFinal?: number | null;
  playoffSeed?: number | null;
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
    };
  };
};

type SummaryData = {
  season?: string | number;
  teams?: SummaryTeam[];
  ownersMap?: Record<string, string>;
};

function formatChampion(champion: HistoryChampion | null) {
  if (!champion) return null;

  return {
    team: champion.team ?? '—',
    owner: champion.owner ?? '—',
    wl: `${champion.wins ?? 0}-${champion.losses ?? 0}${
      champion.ties ? `-${champion.ties}` : ''
    }`,
  };
}

function championFromSummary(summary: SummaryData | null): HistoryChampion | null {
  if (!summary || !Array.isArray(summary.teams) || !summary.teams.length) return null;

  const champ =
    summary.teams.find((team) => Number(team?.finalRank) === 1) ??
    summary.teams.find((team) => Number(team?.finalStanding) === 1) ??
    summary.teams.find((team) => Number(team?.rankCalculatedFinal) === 1);

  if (!champ) return null;

  const ownerId =
    champ.primaryOwner ??
    (Array.isArray(champ.owners) && champ.owners.length ? champ.owners[0] : undefined);

  const owner =
    (ownerId != null && summary.ownersMap?.[String(ownerId)]) ||
    (ownerId != null ? `Owner ${String(ownerId)}` : '—');

  return {
    owner,
    team: champ.name ?? '—',
    wins: Number(champ.record?.overall?.wins ?? 0),
    losses: Number(champ.record?.overall?.losses ?? 0),
    ties: Number(champ.record?.overall?.ties ?? 0),
  };
}

async function getLeagueData(key: LeagueKey) {
  const base = await serverBaseUrl();
  const currentSeason = Number(process.env.ESPN_SEASON || new Date().getFullYear());
  const previousSeason = currentSeason - 1;

  const [history, currentSummary, previousSummary] = await Promise.all([
    fetchJson<any>(`${base}/api/espn/history?key=${key}`),
    fetchJson<SummaryData>(
      `${base}/api/espn/summary?${new URLSearchParams({
        key,
        season: String(currentSeason),
      }).toString()}`,
    ).catch(() => null),
    fetchJson<SummaryData>(
      `${base}/api/espn/summary?${new URLSearchParams({
        key,
        season: String(previousSeason),
      }).toString()}`,
    ).catch(() => null),
  ]);

  const seasons: any[] = Array.isArray(history?.seasons) ? history.seasons : [];
  const latest = [...seasons].sort((a, b) => (b?.season ?? 0) - (a?.season ?? 0))[0] ?? {};
  const seasonYear = Number(currentSummary?.season) || currentSeason;
  const currentTeamCount = Array.isArray(currentSummary?.teams) ? currentSummary.teams.length : 0;
  const teamCount = currentTeamCount || (Array.isArray(latest?.standings) ? latest.standings.length : 12);

  const previousHistorySeason = seasons.find((season) => Number(season?.season) === previousSeason);
  const previousChampion =
    formatChampion(previousHistorySeason?.champion ?? null) ??
    formatChampion(championFromSummary(previousSummary));
  const fallbackChampion = formatChampion(latest?.champion ?? null);
  const champ = previousChampion ?? fallbackChampion;

  const trackedSeasons = new Set<number>(
    seasons
      .map((season) => Number(season?.season))
      .filter((season) => Number.isFinite(season)),
  );
  if (Array.isArray(previousSummary?.teams) && previousSummary.teams.length) trackedSeasons.add(previousSeason);
  if (currentTeamCount) trackedSeasons.add(seasonYear);

  // All-time titles leader
  const titleMap = new Map<string, number>();
  for (const s of seasons) {
    const o = s?.champion?.owner;
    if (o) titleMap.set(o, (titleMap.get(o) || 0) + 1);
  }
  if (!previousHistorySeason?.champion?.owner) {
    const livePreviousChampion = championFromSummary(previousSummary);
    if (livePreviousChampion?.owner) {
      titleMap.set(
        livePreviousChampion.owner,
        (titleMap.get(livePreviousChampion.owner) || 0) + 1,
      );
    }
  }

  let titlesLeaderOwner = '—';
  let titlesLeaderCount = 0;
  for (const [owner, count] of titleMap.entries()) {
    if (count > titlesLeaderCount) {
      titlesLeaderOwner = owner;
      titlesLeaderCount = count;
    }
  }

  return {
    key,
    displayName:
      key === 'A' ? 'ANFF A League' :
      key === 'B' ? 'ANFF B League' :
      'ANFF C League',
    seasonYear,
    teamCount,
    seasonsCount: trackedSeasons.size,
    champ,
    titlesLeader: titlesLeaderCount ? { owner: titlesLeaderOwner, titles: titlesLeaderCount } : null,
  };
}

/** Standings-style section accent (ring + inset top stripe) */
function sectionAccentByKey(k: LeagueKey) {
  const ring =
    k === 'A' ? 'ring-red-500/40 before:bg-red-500'
    : k === 'B' ? 'ring-blue-500/40 before:bg-blue-500'
    :            'ring-orange-500/40 before:bg-orange-500';

  return [
    'relative rounded-2xl border border-gray-800 bg-black/30 ring-1',
    ring,
    'before:absolute before:left-4 before:right-4 before:top-0 before:h-1.5 before:rounded-full content-[""]',
  ].join(' ');
}

const leagueTitleColor = (k: LeagueKey) =>
  k === 'A' ? 'text-red-400'
  : k === 'B' ? 'text-blue-400'
  :            'text-orange-400';

function Card({
  title,
  subtitle,
  children,
  hrefs,
  leagueKey,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  hrefs: { standings: string; teams: string; allTime: string };
  leagueKey: LeagueKey;
}) {
  // Width tuned so all three buttons fit on one line with small gaps.
  return (
    <div className={[sectionAccentByKey(leagueKey), 'w-[380px] sm:w-[390px]'].join(' ')}>
      <div className="p-5 flex flex-col items-stretch">
        <div className="mb-3 text-center">
          <h3 className={`text-2xl font-bold ${leagueTitleColor(leagueKey)}`}>{title}</h3>
          {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-center">
          {children}
        </div>

        <div className="mt-5 text-xs text-gray-400 text-center">
          Playoffs: Weeks 15–17 • Seeds 1–7 only (consolation excluded)
        </div>

        {/* Buttons sized to keep a single line */}
        <div className="mt-4 flex flex-nowrap justify-center gap-2">
          <a
            href={hrefs.standings}
            className="px-3 py-2 rounded-xl text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 bg-white/10 hover:bg-white/15"
          >
            View Standings
          </a>
          <a
            href={hrefs.teams}
            className="px-3 py-2 rounded-xl text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 bg-white/10 hover:bg-white/15"
          >
            View Teams
          </a>
          <a
            href={hrefs.allTime}
            className="px-3 py-2 rounded-xl text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 bg-white/10 hover:bg-white/15"
          >
            All-Time
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function LeaguesPage() {
  const [a, b, c] = await Promise.all([
    getLeagueData('A'),
    getLeagueData('B'),
    getLeagueData('C'),
  ]);

  const Fact = ({ k, v }: { k: string; v: string | number }) => (
    <div className="rounded-xl border border-gray-800/60 bg-black/30 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-400">{k}</div>
      <div className="text-base font-semibold text-white mt-1">{v}</div>
    </div>
  );

  const Champ = ({ c }: { c: any }) =>
    c ? (
      <div className="col-span-2 rounded-xl border border-gray-800/60 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400">Reigning Champion</div>
        <div className="mt-1">
          <div className="text-white font-bold">{c.owner}</div>
          <div className="text-gray-300 text-sm">{c.team} • {c.wl}</div>
        </div>
      </div>
    ) : (
      <div className="col-span-2 rounded-xl border border-gray-800/60 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400">Reigning Champion</div>
        <div className="text-gray-300 mt-1">—</div>
      </div>
    );

  const TitlesLeader = ({ tl }: { tl: { owner: string; titles: number } | null }) =>
    tl ? (
      <div className="col-span-2 rounded-xl border border-gray-800/60 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400">All-Time Titles Leader</div>
        <div className="text-white font-semibold mt-1">
          {tl.owner} <span className="text-gray-300">({tl.titles})</span>
        </div>
      </div>
    ) : (
      <div className="col-span-2 rounded-xl border border-gray-800/60 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400">All-Time Titles Leader</div>
        <div className="text-gray-300 mt-1">—</div>
      </div>
    );

  return (
    <div className="relative min-h-screen text-white">
      {/* Background: faint logo + translucent gradient */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/logo_transparent.png"
          alt="ANFF watermark"
          className="w-full h-full object-contain opacity-[0.25] pointer-events-none select-none"
          style={{ objectPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-black/70" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-5xl font-extrabold text-center mb-8">Leagues</h1>

        {/* Single row on desktop; centered; cards sized to fit buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
          <Card
            leagueKey="A"
            title={a.displayName}
            subtitle={`Season: ${a.seasonYear}`}
            hrefs={{ standings: `/standings?leagueId=${encodeURIComponent('A')}`, teams: `/teams`, allTime: `/all-time?league=A` }}
          >
            <Fact k="Teams" v={a.teamCount} />
            <Fact k="Seasons Tracked" v={a.seasonsCount} />
            <Champ c={a.champ} />
            <TitlesLeader tl={a.titlesLeader} />
          </Card>

          <Card
            leagueKey="B"
            title={b.displayName}
            subtitle={`Season: ${b.seasonYear}`}
            hrefs={{ standings: `/standings?leagueId=${encodeURIComponent('B')}`, teams: `/teams`, allTime: `/all-time?league=B` }}
          >
            <Fact k="Teams" v={b.teamCount} />
            <Fact k="Seasons Tracked" v={b.seasonsCount} />
            <Champ c={b.champ} />
            <TitlesLeader tl={b.titlesLeader} />
          </Card>

          <Card
            leagueKey="C"
            title={c.displayName}
            subtitle={`Season: ${c.seasonYear}`}
            hrefs={{ standings: `/standings?leagueId=${encodeURIComponent('C')}`, teams: `/teams`, allTime: `/all-time?league=C` }}
          >
            <Fact k="Teams" v={c.teamCount} />
            <Fact k="Seasons Tracked" v={c.seasonsCount} />
            <Champ c={c.champ} />
            <TitlesLeader tl={c.titlesLeader} />
          </Card>
        </div>
      </div>
    </div>
  );
}
