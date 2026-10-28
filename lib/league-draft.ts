import { fetchLeagueData } from "./getLeagueSummary";
import {
  buildEspnUrl,
  espnHeadersForLeague,
  getEspnLeagueId,
  toTeamName,
} from "./espn";
import { fetchJson } from "./http";

export async function getLeagueDraft(season: number) {
  const data = await fetchLeagueData(season, [
    "mDraftDetail",
    "mRoster",
    "mTeam",
    "mSettings",
  ]);
  const teams = new Map<number, string>(
    data.teams.map((team: any) => [Number(team.id), toTeamName(team)]),
  );
  const managers = new Map<string, string>(
    (data.members || []).map((member: any) => [
      String(member.id),
      [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
        member.displayName ||
        member.nickname ||
        "Manager unavailable",
    ]),
  );
  const managerForTeam = new Map<number, string>(
    data.teams.map((team: any) => [
      Number(team.id),
      (team.owners || [team.primaryOwner])
        .map((id: string) => managers.get(id))
        .filter(Boolean)
        .join(" / ") || "Manager unavailable",
    ]),
  );
  const names = new Map<number, string>();
  for (const team of data.teams)
    for (const entry of team.roster?.entries || []) {
      const player = entry.playerPoolEntry?.player;
      if (player?.fullName) names.set(Number(player.id), player.fullName);
    }
  const picks: any[] = data.draftDetail?.picks || [];
  const missing = [
    ...new Set<number>(picks.map((pick) => Number(pick.playerId))),
  ].filter((id) => !names.has(id));
  for (let index = 0; index < missing.length; index += 100) {
    try {
      const cards = await fetchJson<any>(
        buildEspnUrl(season, getEspnLeagueId(), ["kona_playercard"]),
        {
          headers: {
            ...espnHeadersForLeague(),
            "x-fantasy-filter": JSON.stringify({
              players: {
                filterIds: { value: missing.slice(index, index + 100) },
                limit: 100,
                sortPercOwned: { sortPriority: 1, sortAsc: false },
              },
            }),
          },
        },
      );
      for (const entry of cards.players || [])
        if (entry.player?.fullName)
          names.set(Number(entry.player.id ?? entry.id), entry.player.fullName);
    } catch {
      /* Unresolved names are shown explicitly as player IDs. */
    }
  }
  return {
    season,
    complete: Boolean(data.draftDetail?.drafted),
    order: (data.settings?.draftSettings?.pickOrder || []).map(
      (id: number) => ({ id, name: teams.get(id) || `Team ${id}` }),
    ) as { id: number; name: string }[],
    picks: picks
      .map((pick) => ({
        round: Number(pick.roundId),
        pick: Number(pick.overallPickNumber),
        team: teams.get(Number(pick.teamId)) || `Team ${pick.teamId}`,
        player: names.get(Number(pick.playerId)) || `Player ${pick.playerId}`,
        manager:
          managerForTeam.get(Number(pick.teamId)) || "Manager unavailable",
        keeper: Boolean(pick.keeper),
      }))
      .sort((a, b) => a.pick - b.pick),
  };
}
