import { fetchLeagueData } from "./getLeagueSummary";
import { getEspnLeagueId, toTeamName, type LeagueKey } from "./espn";
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
  phase: "regular" | "playoffs" | "consolation" | "unknown";
  completed: boolean;
};
export type SeasonBundle = {
  season: number;
  leagueId: string;
  schedule: NormalizedGame[];
};

export async function fetchSeasonSchedule(
  _key: LeagueKey,
  season: number,
): Promise<SeasonBundle> {
  const data = await fetchLeagueData(season, [
    "mMatchup",
    "mMatchupScore",
    "mTeam",
    "mSettings",
  ]);
  const names = new Map<number, string>(
    data.teams.map((team: any) => [Number(team.id), toTeamName(team)]),
  );
  const regularPeriods = Number(
    data.settings?.scheduleSettings?.matchupPeriodCount,
  );
  const schedule: NormalizedGame[] = (data.schedule || []).flatMap(
    (game: any) => {
      if (!game.home?.teamId || !game.away?.teamId) return [];
      const week = Number(game.matchupPeriodId);
      const homePoints = Number(game.home.totalPoints ?? 0),
        awayPoints = Number(game.away.totalPoints ?? 0);
      const tier = game.playoffTierType;
      const phase: NormalizedGame["phase"] =
        tier === "WINNERS_BRACKET"
          ? "playoffs"
          : tier && tier !== "NONE"
            ? "consolation"
            : regularPeriods > 0 && week <= regularPeriods
              ? "regular"
              : "unknown";
      const completed = ["HOME", "AWAY", "TIE"].includes(game.winner);
      return [
        {
          season,
          week,
          homeTeamId: Number(game.home.teamId),
          awayTeamId: Number(game.away.teamId),
          homeName:
            names.get(Number(game.home.teamId)) || `Team ${game.home.teamId}`,
          awayName:
            names.get(Number(game.away.teamId)) || `Team ${game.away.teamId}`,
          homePoints,
          awayPoints,
          margin: Math.abs(homePoints - awayPoints),
          completed,
          phase,
          isPlayoffs: phase === "playoffs",
          winnerTeamId:
            game.winner === "HOME"
              ? Number(game.home.teamId)
              : game.winner === "AWAY"
                ? Number(game.away.teamId)
                : null,
        },
      ];
    },
  );
  return { season, leagueId: getEspnLeagueId(), schedule };
}
