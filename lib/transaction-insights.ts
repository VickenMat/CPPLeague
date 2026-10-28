import { buildEspnUrl, espnHeadersForLeague } from './espn';
import { fetchJson } from './http';
import { getTransactionHistory } from './transaction-history';
import { pointsSinceTransaction, type InsightPlayer, type ProTeamSchedule } from './transaction-points';

export async function getTransactionInsights(leagueId: string, season: string, teamId: number) {
  const history = await getTransactionHistory(leagueId, season);
  if (!history.teams.some(team => team.id === teamId)) throw new Error('Team not found');
  const moves = history.transactions.filter(transaction => transaction.teamId === teamId &&
    ['Added', 'Waiver add', 'Dropped'].includes(transaction.action));
  if (!moves.length) return { ...history, transactions: moves };
  const headers = espnHeadersForLeague({ leagueId });
  const ids = [...new Set(moves.map(move => move.playerId))];
  const week = history.currentWeek;
  if (typeof week !== 'number' || !Number.isInteger(week) || week < 1 || week > 25) {
    return { ...history, transactions: moves, warning: 'The current scoring week is unavailable; points cannot be calculated.' };
  }
  const scheduleRequest = fetchJson<{ settings?: { proTeams?: ProTeamSchedule[] } }>(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}?view=proTeamSchedules_wl`, { headers },
  );
  const batches: number[][] = [];
  for (let offset = 0; offset < ids.length; offset += 50) batches.push(ids.slice(offset, offset + 50));
  const [scheduleResult, ...cardResults] = await Promise.allSettled([
    scheduleRequest,
    ...batches.map(batch => fetchJson<{ players?: { player?: InsightPlayer }[] }>(
      buildEspnUrl(season, leagueId, ['kona_playercard']), {
        headers: { ...headers, 'x-fantasy-filter': JSON.stringify({ players: {
          filterIds: { value: batch }, limit: 50,
          filterStatsForTopScoringPeriodIds: { value: week, additionalValue: [`00${season}`] },
        } }) },
      },
    )),
  ]);
  const scheduleData = scheduleResult.status === 'fulfilled' && 'settings' in scheduleResult.value
    ? scheduleResult.value.settings?.proTeams || [] : [];
  const schedules = new Map(scheduleData.map(team => [team.id, team]));
  const players = new Map<number, InsightPlayer>();
  for (const result of cardResults) {
    if (result.status === 'fulfilled' && 'players' in result.value) {
      for (const entry of result.value.players || []) if (entry.player) players.set(entry.player.id, entry.player);
    }
  }
  const asOf = Date.now();
  const transactions = moves.map(move => {
    const result = pointsSinceTransaction(players.get(move.playerId), move.date, Number(season), schedules, asOf);
    return { ...move, pointsSince: result.points, gamesSince: result.games };
  });
  const warnings = [history.warning];
  if (transactions.some(move => move.pointsSince === null)) warnings.push('Some game history is unavailable; those insights are shown as —.');
  return { ...history, transactions, asOf: new Date(asOf).toISOString(), warning: warnings.filter(Boolean).join(' ') || undefined };
}
