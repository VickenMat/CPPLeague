import type { PlayerStat } from "./player-stats";

export type ProTeamSchedule = {
  id: number;
  proGamesByScoringPeriod?: Record<string, { date: number }[]>;
};
export type InsightPlayer = {
  id: number;
  proTeamId?: number;
  stats?: PlayerStat[];
};

/** Count actual league-scored points only for games kicking off after this move. */
export function pointsSinceTransaction(
  player: InsightPlayer | undefined,
  transactionDate: string | null,
  season: number,
  schedules: Map<number, ProTeamSchedule>,
  now = Date.now(),
): { points: number | null; games: number | null } {
  const unavailable = { points: null, games: null };
  if (!player || !Array.isArray(player.stats) || !transactionDate)
    return unavailable;
  const cutoff = Date.parse(transactionDate);
  if (!Number.isFinite(cutoff) || cutoff > now) return unavailable;
  const actual = player.stats.filter(
    (stat) => stat.seasonId === season && stat.statSourceId === 0,
  );
  const total = actual.find(
    (stat) => stat.statSplitTypeId === 0 && stat.scoringPeriodId === 0,
  );
  const weekly = actual.filter(
    (stat) => stat.statSplitTypeId === 1 && stat.scoringPeriodId > 0,
  );
  // A nonzero season total with missing weekly history cannot be dated reliably.
  if (!weekly.length)
    return total?.stats?.["210"] === 0 && total.appliedTotal === 0
      ? { points: 0, games: 0 }
      : unavailable;
  let points = 0;
  let games = 0;
  let recordedGames = 0;
  const seen = new Set<number>();
  for (const stat of weekly) {
    if (seen.has(stat.scoringPeriodId)) return unavailable;
    seen.add(stat.scoringPeriodId);
    const played = stat.stats?.["210"];
    // ESPN can include empty weekly rows for byes, injuries, and future games.
    if (
      played === 0 ||
      (!Object.keys(stat.stats || {}).length && stat.appliedTotal === 0)
    )
      continue;
    recordedGames++;
    const proTeamId =
      stat.proTeamId && stat.proTeamId > 0 ? stat.proTeamId : player.proTeamId;
    const schedule =
      proTeamId === undefined ? undefined : schedules.get(proTeamId);
    const game =
      schedule?.proGamesByScoringPeriod?.[String(stat.scoringPeriodId)];
    if (!game || game.length !== 1 || !Number.isFinite(game[0].date))
      return unavailable;
    if (game[0].date <= cutoff || game[0].date > now) continue;
    if (
      typeof stat.appliedTotal !== "number" ||
      !Number.isFinite(stat.appliedTotal)
    )
      return unavailable;
    points += stat.appliedTotal;
    games++;
  }
  if (
    typeof total?.stats?.["210"] === "number" &&
    total.stats["210"] > recordedGames
  )
    return unavailable;
  return { points: Math.round(points * 100) / 100, games };
}
