import { buildEspnUrl, espnHeadersForLeague } from './espn';
import { fetchJson } from './http';
import { loadPlayerIndex } from './player-values';
import { playerFantasyStats, type PlayerStat } from './player-stats';

type PoolEntry = {
  id: number;
  status: string;
  onTeamId: number;
  waiverProcessDate?: number;
  player: {
    fullName: string;
    defaultPositionId: number;
    proTeamId?: number;
    proTeamAbbrev?: string;
    injuryStatus?: string;
    ownership?: { percentOwned?: number };
    stats?: PlayerStat[];
  };
};

const POS: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST' };
// ESPN team IDs: https://github.com/cwendt94/espn-api/blob/master/espn_api/football/constant.py
const NFL_TEAMS: Record<number, string> = {
  0: 'FA', 1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL',
  7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV',
  14: 'LAR', 15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB',
  28: 'WSH', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};
const PAGE_SIZE = 500;

export async function getAvailablePlayers(leagueId: string, season: string) {
  const headers = espnHeadersForLeague({ leagueId });
  const warnings: string[] = [];
  const [leagueResult, scheduleResult] = await Promise.allSettled([
    fetchJson<{ scoringPeriodId?: number; status?: { latestScoringPeriod?: number } }>(
      buildEspnUrl(season, leagueId, ['mSettings']), { headers },
    ),
    fetchJson<{ settings?: { proTeams?: { id: number; byeWeek?: number }[] } }>(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}?view=proTeamSchedules_wl`, { headers },
    ),
  ]);
  const week = leagueResult.status === 'fulfilled'
    ? leagueResult.value.scoringPeriodId ?? leagueResult.value.status?.latestScoringPeriod : undefined;
  const currentWeek = typeof week === 'number' && Number.isInteger(week) && week > 0 ? week : null;
  if (currentWeek === null) warnings.push('Current week unavailable; weekly projections and bye-week colors are unavailable.');
  const proTeams = scheduleResult.status === 'fulfilled' ? scheduleResult.value.settings?.proTeams : undefined;
  const byeWeeks = new Map((proTeams || []).map(team => [team.id, team.byeWeek]));
  if (!proTeams?.length) warnings.push('Bye weeks are unavailable.');
  const url = buildEspnUrl(season, leagueId, ['kona_player_info']) +
    (currentWeek === null ? '' : `&scoringPeriodId=${currentWeek}`);
  const entries = new Map<number, PoolEntry>();
  let complete = false;
  // Fetch every page; never silently present a truncated pool as complete.
  for (let page = 0; page < 30; page++) {
    const data = await fetchJson<{ players: PoolEntry[] }>(url, {
      headers: {
        ...headers,
        'x-fantasy-filter': JSON.stringify({ players: {
          filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sortPercOwned: { sortPriority: 1, sortAsc: false },
          sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' },
        } }),
      },
    });
    if (!Array.isArray(data.players)) throw new Error('ESPN did not return a player pool.');
    const previousSize = entries.size;
    for (const entry of data.players) entries.set(entry.id, entry);
    if (data.players.length && entries.size === previousSize) {
      throw new Error('ESPN repeated a player-pool page. Please refresh to try again.');
    }
    if (data.players.length < PAGE_SIZE) {
      complete = true;
      break;
    }
  }
  if (!complete) throw new Error('ESPN player pool could not be fully loaded. Please try again.');

  let values: Awaited<ReturnType<typeof loadPlayerIndex>> = new Map();
  try {
    values = await loadPlayerIndex();
  } catch {
    warnings.push('FantasyCalc values are unavailable. Player availability is still shown.');
  }
  const players = Array.from(entries.values())
    .filter((entry) => entry.onTeamId === 0 && ['FREEAGENT', 'WAIVERS'].includes(entry.status))
    .map((entry) => {
      const row = values.get(entry.id);
      const position = POS[entry.player.defaultPositionId] || 'Other';
      const injuryStatus = entry.player.injuryStatus || '';
      const onInjuredReserve = ['IR', 'INJURYRESERVE', 'INJUREDRESERVE'].includes(
        injuryStatus.toUpperCase().replace(/[^A-Z]/g, ''),
      );
      const value = onInjuredReserve ? 0 : position === 'D/ST' ? 100
        : position === 'K' ? 50
        : row?.value?.trim() ? Number(row.value) : NaN;
      const byeWeek = byeWeeks.get(entry.player.proTeamId ?? -1);
      return {
        id: entry.id,
        name: entry.player.fullName,
        position,
        nflTeam: entry.player.proTeamAbbrev || NFL_TEAMS[entry.player.proTeamId ?? -1] || row?.team || '',
        status: entry.status,
        waiverProcessDate: entry.status === 'WAIVERS' ? entry.waiverProcessDate ?? null : null,
        injuryStatus,
        percentOwned: entry.player.ownership?.percentOwned ?? null,
        value: Number.isFinite(value) ? value : null,
        ...playerFantasyStats(entry.player.stats || [], Number(season), currentWeek),
        byeWeek: typeof byeWeek === 'number' && Number.isInteger(byeWeek) && byeWeek > 0 ? byeWeek : null,
      };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || (b.percentOwned ?? 0) - (a.percentOwned ?? 0) || a.name.localeCompare(b.name));
  return { players, currentWeek, warning: warnings.length ? warnings.join(' ') : undefined };
}
