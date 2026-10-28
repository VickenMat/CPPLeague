export type PlayerStat = {
  seasonId: number;
  scoringPeriodId: number;
  statSourceId: number;
  statSplitTypeId: number;
  proTeamId?: number;
  appliedTotal?: number;
  appliedAverage?: number;
  stats?: Record<string, number>;
};

const finite = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** ESPN applied totals/averages already include this league's scoring rules. */
export function playerFantasyStats(stats: PlayerStat[], season: number, week: number | null) {
  const actual = stats.find(stat => stat.seasonId === season && stat.statSourceId === 0 &&
    stat.statSplitTypeId === 0 && stat.scoringPeriodId === 0);
  const projected = week === null ? undefined : stats.find(stat => stat.seasonId === season &&
    stat.statSourceId === 1 && stat.statSplitTypeId === 1 && stat.scoringPeriodId === week);
  const seasonTotal = finite(actual?.appliedTotal);
  // Stat 210 is games played. Never divide by the current week (byes/injuries differ).
  const gamesPlayed = finite(actual?.stats?.['210']);
  const pointsPerGame = gamesPlayed === 0 ? null : finite(actual?.appliedAverage) ??
    (gamesPlayed !== null && gamesPlayed > 0 && seasonTotal !== null ? seasonTotal / gamesPlayed : null);
  return { weeklyProjection: finite(projected?.appliedTotal), seasonTotal, pointsPerGame };
}
