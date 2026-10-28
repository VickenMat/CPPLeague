import { unstable_cache } from "next/cache";
import { getLeagueSummary } from "./getLeagueSummary";
import { getEspnLeagueId } from "./espn";
import { currentSeason } from "./league";

export async function getLeagueHistory() {
  return unstable_cache(
    async () => {
      const current = await getLeagueSummary();
      const years: number[] = [
        ...new Set<number>(current.previousSeasons),
      ].sort((a, b) => a - b);
      const results = await Promise.allSettled(
        years.map((season) => getLeagueSummary({ season })),
      );
      const notes: string[] = [];
      const raw: Record<string, string | number | null>[] = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          notes.push(`${years[index]} could not be loaded from ESPN.`);
          return;
        }
        const league = result.value;
        for (const team of league.teams) {
          const rank = Number(team.finalRank);
          if (!Number.isInteger(rank) || rank <= 0) {
            notes.push(
              `${league.season}: final rank unavailable for ${team.name}.`,
            );
            continue;
          }
          const record = team.record?.overall || {};
          raw.push({
            Season: league.season,
            TeamId: Number(team.id),
            Rank: rank,
            Owner: team.displayOwner,
            Team: team.name,
            Wins: record.wins ?? 0,
            Losses: record.losses ?? 0,
            Ties: record.ties ?? 0,
            PF: team.pointsFor,
            PA: team.pointsAgainst,
            Moves: team.transactionCounter?.acquisitions ?? null,
            PlayoffTeams: league.settings.playoffTeamCount,
          });
        }
      });
      return { raw, notes, years };
    },
    ["league-history-v2", getEspnLeagueId(), String(currentSeason())],
    { revalidate: 300 },
  )();
}
